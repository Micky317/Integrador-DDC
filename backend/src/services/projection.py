import os
import math
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from src.core.supabase import supabase_client

# Coeficientes estándar del modelo de osificación cuadrático entrenado (baseline.json)
BASELINE_A = -0.003369
BASELINE_B = -0.419446
BASELINE_C = 31.762887

CLINICAL_PRIORS = {
    "yeso": -2.0,        # Exceso de corrección (grados/mes) sobre el desarrollo normal
    "arnes": -1.2,
    "ejercicios": -0.35,
    "observacion": 0.0,
    "cirugia": 0.0
}

def get_standard_angle(age_months: float) -> float:
    """Retorna el ángulo acetabular normal poblacional esperado para la edad dada."""
    return BASELINE_A * (age_months ** 2) + BASELINE_B * age_months + BASELINE_C

def calculate_age_months(birth_date_str: str, target_date_str: str) -> float:
    """Calcula la edad en meses entre la fecha de nacimiento y una fecha objetivo."""
    if not birth_date_str or not target_date_str:
        return 0.0
    try:
        birth = datetime.strptime(birth_date_str.split('T')[0], "%Y-%m-%d")
        target_val = target_date_str.split('T')[0]
        target = datetime.strptime(target_val, "%Y-%m-%d")
        diff_days = (target - birth).days
        return max(0.0, diff_days / 30.44)
    except Exception as e:
        print(f"⚠️ Error al calcular edad en meses: {e}")
        return 0.0

def get_age_calcification_factor(age_months: float) -> float:
    """
    Retorna el factor de plasticidad ósea según la edad (calcificación progresiva).
    A mayor edad, los huesos se calcifican más y los tratamientos son menos efectivos.
    """
    if age_months <= 4.0:
        return 1.0     # 100% efectividad
    elif age_months <= 8.0:
        return 0.8     # 80% efectividad
    elif age_months <= 12.0:
        return 0.6     # 60% efectividad
    elif age_months <= 18.0:
        return 0.4     # 40% efectividad
    else:
        return 0.2     # 20% efectividad (baja plasticidad)

_POPULATION_RATES_CACHE = None
_POPULATION_RATES_CACHE_TIME = 0.0

def get_population_treatment_rates() -> dict:
    """
    Analiza a todos los pacientes y su historial de radiografías en la BD
    para calcular las tasas de corrección reales promedio por combinación de tratamientos.
    """
    global _POPULATION_RATES_CACHE, _POPULATION_RATES_CACHE_TIME
    import time
    
    # Caché por 5 minutos (300 segundos) para evitar peticiones repetitivas a Supabase
    if _POPULATION_RATES_CACHE is not None and (time.time() - _POPULATION_RATES_CACHE_TIME) < 300:
        return _POPULATION_RATES_CACHE

    if not supabase_client:
        return {}
        
    try:
        # 1. Recuperar pacientes y análisis de la DB
        patients_res = supabase_client.table("pacientes").select("id, fecha_nacimiento, tratamientos_asignados").execute()
        analisis_res = supabase_client.table("analisis").select("paciente_id, fecha_radiografia, created_at, angulo_izq, angulo_der").execute()
        
        patients_dict = {p["id"]: p for p in patients_res.data}
        
        # 2. Agrupar los análisis por paciente
        paciente_analisis = defaultdict(list)
        for a in analisis_res.data:
            # Descartar análisis corruptos o incompletos
            if a.get("angulo_izq") is not None and a.get("angulo_der") is not None:
                paciente_analisis[a["paciente_id"]].append(a)
                
        treatment_slopes = defaultdict(list)
        
        # 3. Calcular la tasa de corrección para cada paciente con historial
        for p_id, analyses in paciente_analisis.items():
            if len(analyses) < 2:
                continue
                
            patient = patients_dict.get(p_id)
            if not patient or not patient.get("fecha_nacimiento"):
                continue
                
            # Ordenar análisis por fecha
            def get_date(a):
                return a.get("fecha_radiografia") or a.get("created_at")
                
            analyses_sorted = sorted(analyses, key=get_date)
            first = analyses_sorted[0]
            last = analyses_sorted[-1]
            
            x1 = calculate_age_months(patient["fecha_nacimiento"], get_date(first))
            x2 = calculate_age_months(patient["fecha_nacimiento"], get_date(last))
            
            if x2 <= x1 + 0.46:  # Al menos 14 días de diferencia para evitar ruido extremo
                continue
                
            y1 = (float(first["angulo_izq"]) + float(first["angulo_der"])) / 2.0
            y2 = (float(last["angulo_izq"]) + float(last["angulo_der"])) / 2.0
            
            # Pendiente total observada (grados/mes)
            r_observed = (y2 - y1) / (x2 - x1)
            
            # Pendiente esperada por crecimiento normal del modelo
            y_std_1 = get_standard_angle(x1)
            y_std_2 = get_standard_angle(x2)
            r_std_growth = (y_std_2 - y_std_1) / (x2 - x1)
            
            # Tasa neta añadida por el tratamiento
            r_treatment = r_observed - r_std_growth
            
            # Acotar la tasa para evitar anomalías (ej. cirugías u errores de entrada)
            # Una corrección física normal no supera los -5.0° por mes, ni empeora más de +1.0° por mes
            r_treatment = max(-5.0, min(1.0, r_treatment))
            
            # Clave única de tratamiento agrupada
            trats = patient.get("tratamientos_asignados") or []
            if not trats:
                trats = ["observacion"]
            trats_key = tuple(sorted(trats))
            
            treatment_slopes[trats_key].append(r_treatment)
            
        # 4. Calcular promedio y cantidad de datos para cada tratamiento
        rates = {}
        for trats_key, slopes in treatment_slopes.items():
            rates[trats_key] = (sum(slopes) / len(slopes), len(slopes))
            
        _POPULATION_RATES_CACHE = rates
        _POPULATION_RATES_CACHE_TIME = time.time()
        return rates
    except Exception as e:
        print(f"❌ Error al calcular tasas poblacionales: {e}")
        return {}

def get_effective_treatment_rate(treatments: list, population_rates: dict) -> tuple:
    """
    Retorna la tasa teórica total de corrección y el componente de ejercicios.
    Combina las estadísticas reales de la base de datos con las prioridades clínicas teóricas (Bayesiano/Blend).
    """
    if not treatments:
        treatments = ["observacion"]
        
    trats_key = tuple(sorted(treatments))
    
    # Calcular el prior clínico (suma de efectos de tratamientos combinados)
    prior_val = 0.0
    for t in treatments:
        prior_val += CLINICAL_PRIORS.get(t, 0.0)
        
    prior_val = max(-3.0, prior_val)  # Límite máximo de corrección física
    
    exercises_portion = CLINICAL_PRIORS.get("ejercicios", 0.0) if "ejercicios" in treatments else 0.0
    
    # Si tenemos datos en la población de pacientes terminados o avanzados, mezclamos (blend)
    observed_avg = 0.0
    count = 0
    if trats_key in population_rates:
        observed_avg, count = population_rates[trats_key]
        
    # Constante de suavizado K (peso del prior clínico cuando hay pocos datos)
    K = 3.0
    blended_rate = (count * observed_avg + K * prior_val) / (count + K)
    
    return blended_rate, exercises_portion

def calculate_patient_compliance(paciente_id: str) -> float:
    """Calcula el factor de cumplimiento de ejercicios del paciente en los últimos 30 días."""
    if not supabase_client:
        return 0.8
        
    try:
        from datetime import datetime, timezone
        limit_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        
        res = supabase_client.table("historial_rehabilitacion") \
            .select("fecha, duracion_segundos") \
            .eq("paciente_id", paciente_id) \
            .gte("fecha", limit_date) \
            .execute()
            
        logs = res.data
        if not logs:
            return 0.2  # Cumplimiento muy bajo por inactividad
            
        active_days = set()
        for log in logs:
            fecha_str = log.get("fecha")
            duracion = log.get("duracion_segundos") or 0
            if fecha_str and duracion >= 600:  # Al menos 10 minutos
                day_str = fecha_str.split('T')[0]
                active_days.add(day_str)
                
        compliance = len(active_days) / 30.0
        return max(0.2, min(1.0, compliance))
    except Exception as e:
        print(f"❌ Error al calcular adherencia del paciente {paciente_id}: {e}")
        return 0.8

def calculate_patient_response_factor(paciente_id: str, birth_date_str: str, base_treatment_rate: float, analyses: list = None) -> float:
    """
    Compara la evolución clínica histórica del paciente con la tasa promedio esperada.
    Genera un factor gamma de respuesta biológica individual (feedback loop).
    """
    if not birth_date_str or abs(base_treatment_rate) < 0.05:
        return 1.0
        
    try:
        if analyses is None:
            if not supabase_client:
                return 1.0
            res = supabase_client.table("analisis").select("fecha_radiografia, created_at, angulo_izq, angulo_der").eq("paciente_id", paciente_id).execute()
            analyses = [a for a in res.data if a.get("angulo_izq") is not None and a.get("angulo_der") is not None]
        else:
            analyses = [a for a in analyses if a.get("angulo_izq") is not None and a.get("angulo_der") is not None]
        
        if len(analyses) < 2:
            return 1.0
            
        def get_date(a):
            return a.get("fecha_radiografia") or a.get("created_at")
            
        analyses_sorted = sorted(analyses, key=get_date)
        first = analyses_sorted[0]
        last = analyses_sorted[-1]
        
        x1 = calculate_age_months(birth_date_str, get_date(first))
        x2 = calculate_age_months(birth_date_str, get_date(last))
        
        if x2 <= x1 + 0.46:
            return 1.0
            
        y1 = (float(first["angulo_izq"]) + float(first["angulo_der"])) / 2.0
        y2 = (float(last["angulo_izq"]) + float(last["angulo_der"])) / 2.0
        
        r_observed = (y2 - y1) / (x2 - x1)
        
        y_std_1 = get_standard_angle(x1)
        y_std_2 = get_standard_angle(x2)
        r_std_growth = (y_std_2 - y_std_1) / (x2 - x1)
        
        r_achieved_treatment = r_observed - r_std_growth
        
        # Gamma = tasa lograda / tasa esperada
        # Como ambas tasas son negativas (decrecen), la división da positiva
        gamma = r_achieved_treatment / base_treatment_rate
        
        # Suavizar con un prior de 1.0 (peso 50%) para evitar fluctuaciones por ruido de medición
        gamma_smoothed = 0.5 * gamma + 0.5 * 1.0
        
        # Acotar
        return max(0.3, min(2.0, gamma_smoothed))
    except Exception as e:
        print(f"❌ Error al calcular factor de respuesta individual: {e}")
        return 1.0

def generate_patient_projection(paciente_id: str, granularity: str = "meses") -> dict:
    """
    Genera los puntos proyectados de recuperación de la cadera izquierda y derecha,
    adaptándose dinámicamente a la edad, cumplimiento, tratamientos combinados y feedback poblacional/individual.
    """
    if not supabase_client:
        return {"error": "Supabase client not configured"}
        
    try:
        # 1. Recuperar paciente
        p_res = supabase_client.table("pacientes").select("*").eq("id", paciente_id).execute()
        if not p_res.data:
            return {"error": f"Paciente con ID {paciente_id} no encontrado"}
        patient = p_res.data[0]
        birth_date = patient.get("fecha_nacimiento")
        treatments = patient.get("tratamientos_asignados") or []
        
        # 2. Recuperar análisis
        a_res = supabase_client.table("analisis").select("*").eq("paciente_id", paciente_id).execute()
        analyses = [a for a in a_res.data if a.get("angulo_izq") is not None and a.get("angulo_der") is not None]
        
        if not analyses:
            return {
                "paciente_id": paciente_id,
                "nombre_completo": patient.get("nombre_completo"),
                "historial_vacio": True,
                "proyeccion_izq": [],
                "proyeccion_der": []
            }
            
        def get_date(a):
            return a.get("fecha_radiografia") or a.get("created_at")
            
        analyses_sorted = sorted(analyses, key=get_date)
        latest_analysis = analyses_sorted[-1]
        
        latest_date_str = get_date(latest_analysis)
        x0 = calculate_age_months(birth_date, latest_date_str)
        y0_izq = float(latest_analysis["angulo_izq"])
        y0_der = float(latest_analysis["angulo_der"])
        
        # 3. Obtener tasas de tratamiento mezclando población + priors
        pop_rates = get_population_treatment_rates()
        base_rate, exercises_portion = get_effective_treatment_rate(treatments, pop_rates)
        
        # 4. Calcular cumplimiento del paciente
        compliance = 1.0
        if "ejercicios" in treatments:
            compliance = calculate_patient_compliance(paciente_id)
            
        # Ponderar la tasa efectiva final con el cumplimiento
        effective_rate = base_rate - exercises_portion + (exercises_portion * compliance)
        
        # 5. Obtener el factor de respuesta individual (feedback loop)
        gamma = calculate_patient_response_factor(paciente_id, birth_date, effective_rate, analyses=analyses)
        
        # 6. Definir pasos y escalas según granularidad
        if granularity == "dias":
            steps = [i for i in range(1, 31)]
            step_to_months = lambda s: s / 30.44
            label_fn = lambda s, d: f"+{s}d"
            advance_days = lambda base_dt, s: base_dt + timedelta(days=s)
        elif granularity == "semanas":
            steps = [i for i in range(1, 13)]
            step_to_months = lambda s: s / 4.33
            label_fn = lambda s, d: f"+{s}s"
            advance_days = lambda base_dt, s: base_dt + timedelta(weeks=s)
        else:  # meses
            steps = [i for i in range(1, 7)]
            step_to_months = lambda s: float(s)
            label_fn = lambda s, d: f"+{s}m"
            advance_days = lambda base_dt, s: base_dt + timedelta(days=int(s * 30.44))
            
        try:
            base_dt = datetime.strptime(latest_date_str.split('T')[0], "%Y-%m-%d")
        except Exception:
            base_dt = datetime.now()
            
        projected_izq = []
        projected_der = []
        
        # Simular trayectoria paso a paso integrando el factor de edad móvil
        # y = y0 + std_growth(x) + treatment_effect * f_age(x) * gamma * dt
        current_izq = y0_izq
        current_der = y0_der
        last_offset = 0.0
        
        for step in steps:
            months_offset = step_to_months(step)
            dt = months_offset - last_offset
            x_future = x0 + months_offset
            
            # Factor de calcificación móvil
            f_age = get_age_calcification_factor(x_future)
            
            # Crecimiento normal esperado en este micro-intervalo
            std_growth = get_standard_angle(x_future) - get_standard_angle(x0 + last_offset)
            
            # Efecto del tratamiento en este micro-intervalo
            treatment_effect = (effective_rate * f_age * gamma) * dt
            
            # Estabilización clínica: Si la cadera alcanza el rango sano (<28°), el tratamiento cesa y sigue el desarrollo normal
            if current_izq > 28.0:
                current_izq = max(0.0, current_izq + std_growth + treatment_effect)
            else:
                current_izq = max(0.0, current_izq + std_growth)
                
            if current_der > 28.0:
                current_der = max(0.0, current_der + std_growth + treatment_effect)
            else:
                current_der = max(0.0, current_der + std_growth)
            
            future_date = advance_days(base_dt, step)
            future_date_str = future_date.strftime("%Y-%m-%d")
            
            projected_izq.append({
                "step": step,
                "label": label_fn(step, future_date),
                "fecha": future_date_str,
                "angulo_proyectado": round(current_izq, 2),
                "edad_meses": round(x_future, 2)
            })
            
            projected_der.append({
                "step": step,
                "label": label_fn(step, future_date),
                "fecha": future_date_str,
                "angulo_proyectado": round(current_der, 2),
                "edad_meses": round(x_future, 2)
            })
            
            last_offset = months_offset
            
        # 7. Calcular el Pronóstico Inicial Ideal (desde la primera radiografía, 100% de cumplimiento, gamma=1.0)
        first_analysis = analyses_sorted[0]
        x_first = calculate_age_months(birth_date, get_date(first_analysis))
        y_first_izq = float(first_analysis["angulo_izq"])
        y_first_der = float(first_analysis["angulo_der"])
        
        rate_ideal = base_rate
        pronostico_inicial_izq = []
        pronostico_inicial_der = []
        
        def calculate_ideal_val(y_start, x_current):
            if x_current <= x_first + 0.01:
                return y_start
            curr_x = x_first
            curr_y = y_start
            dt_step = 0.5
            while curr_x < x_current - 0.001:
                dt = min(dt_step, x_current - curr_x)
                f_age_tmp = get_age_calcification_factor(curr_x + dt)
                std_growth_tmp = get_standard_angle(curr_x + dt) - get_standard_angle(curr_x)
                treatment_effect_tmp = (rate_ideal * f_age_tmp * 1.0) * dt
                if curr_y > 28.0:
                    curr_y = max(0.0, curr_y + std_growth_tmp + treatment_effect_tmp)
                else:
                    curr_y = max(0.0, curr_y + std_growth_tmp)
                curr_x += dt
            return round(curr_y, 2)

        # Puntos del pronóstico inicial alineados con el histórico
        for a in analyses_sorted:
            x_a = calculate_age_months(birth_date, get_date(a))
            pronostico_inicial_izq.append(calculate_ideal_val(y_first_izq, x_a))
            pronostico_inicial_der.append(calculate_ideal_val(y_first_der, x_a))
            
        # Puntos del pronóstico inicial alineados con los pasos futuros
        for step in steps:
            months_offset = step_to_months(step)
            x_future = x0 + months_offset
            pronostico_inicial_izq.append(calculate_ideal_val(y_first_izq, x_future))
            pronostico_inicial_der.append(calculate_ideal_val(y_first_der, x_future))

        # 8. Estimación de meses para la meta (< 28 grados)
        avg_current = (y0_izq + y0_der) / 2.0
        already_normal = avg_current <= 28.0
        
        months_to_goal = None
        if not already_normal:
            sim_izq = y0_izq
            sim_der = y0_der
            for m in range(1, 48):  # Simular hasta 4 años si es necesario
                x_test = x0 + m
                f_age_test = get_age_calcification_factor(x_test)
                std_growth_test = get_standard_angle(x_test) - get_standard_angle(x0 + m - 1)
                treatment_test = (effective_rate * f_age_test * gamma) * 1.0
                
                sim_izq = max(0.0, sim_izq + std_growth_test + treatment_test)
                sim_der = max(0.0, sim_der + std_growth_test + treatment_test)
                
                if (sim_izq + sim_der) / 2.0 <= 28.0:
                    months_to_goal = m
                    break
                    
        return {
            "paciente_id": paciente_id,
            "nombre_completo": patient.get("nombre_completo"),
            "edad_actual_meses": round(x0, 2),
            "ultima_medicion": {
                "fecha": latest_date_str.split('T')[0],
                "izq": y0_izq,
                "der": y0_der
            },
            "tratamientos_activos": treatments,
            "cumplimiento_ejercicios_pct": round(compliance * 100, 1) if "ejercicios" in treatments else None,
            "factor_respuesta_paciente": round(gamma, 2),
            "tasa_tratamiento_mensual": round(effective_rate, 3),
            "ya_esta_sano": already_normal,
            "meses_para_meta": months_to_goal,
            "proyeccion_izq": projected_izq,
            "proyeccion_der": projected_der,
            "pronostico_inicial_izq": pronostico_inicial_izq,
            "pronostico_inicial_der": pronostico_inicial_der
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Error calculando proyección dinámica: {str(e)}"}
