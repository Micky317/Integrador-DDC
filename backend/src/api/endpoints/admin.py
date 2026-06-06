from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from src.core.supabase import supabase_client

router = APIRouter()

class ValidationRequest(BaseModel):
    validada: bool

class PatientCreate(BaseModel):
    nombre_completo: str
    fecha_nacimiento: str
    sexo: str
    medico_id: str
    nombre_tutor: Optional[str] = None
    telefono_contacto: Optional[str] = None
    edad_gestacional: Optional[int] = None
    presentacion_nalgas: bool = False
    antecedente_familiar: bool = False
    codigo_paciente: Optional[str] = None

@router.get("/doctors")
async def get_all_doctors(background_tasks: BackgroundTasks):
    """
    Obtiene todos los médicos registrados en la plataforma (usa Service Role Key).
    """
    try:
        from sync_supabase_to_influx import sync_data
        background_tasks.add_task(sync_data)
    except Exception as e:
        print(f"⚠️ Error al encolar sincronización de fondo: {e}")

    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado en el backend")
    
    try:
        response = supabase_client.table("profiles")\
            .select("*")\
            .eq("rol", "medico")\
            .order("nombre_completo")\
            .execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo médicos: {str(e)}")

@router.get("/patients/{doctor_id}")
async def get_patients_by_doctor(doctor_id: str, background_tasks: BackgroundTasks):
    """
    Obtiene todos los pacientes asignados a un médico específico (usa Service Role Key).
    """
    try:
        from sync_supabase_to_influx import sync_data
        background_tasks.add_task(sync_data)
    except Exception as e:
        print(f"⚠️ Error al encolar sincronización de fondo: {e}")

    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado en el backend")
    
    try:
        response = supabase_client.table("pacientes")\
            .select("*")\
            .eq("medico_id", doctor_id)\
            .order("nombre_completo")\
            .execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo pacientes: {str(e)}")

@router.post("/doctors/{doctor_id}/validate")
async def validate_doctor(doctor_id: str, payload: ValidationRequest):
    """
    Valida o invalida la matrícula profesional de un médico (usa Service Role Key).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado en el backend")
    
    try:
        response = supabase_client.table("profiles")\
            .update({"matricula_validada": payload.validada})\
            .eq("id", doctor_id)\
            .execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Médico no encontrado")
        return {"status": "success", "message": f"Estado de validación actualizado a {payload.validada}", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar médico: {str(e)}")

@router.get("/stats")
async def get_global_stats(background_tasks: BackgroundTasks):
    """
    Obtiene estadísticas globales del sistema de forma precisa bypassando RLS.
    """
    try:
        from sync_supabase_to_influx import sync_data
        background_tasks.add_task(sync_data)
    except Exception as e:
        print(f"⚠️ Error al encolar sincronización de fondo en stats: {e}")

    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado en el backend")
    
    try:
        # Médicos totales
        doctors_res = supabase_client.table("profiles")\
            .select("id", count="exact")\
            .eq("rol", "medico")\
            .execute()
        total_doctors = doctors_res.count if doctors_res.count is not None else len(doctors_res.data or [])

        # Pacientes totales
        patients_res = supabase_client.table("pacientes")\
            .select("id", count="exact")\
            .execute()
        total_patients = patients_res.count if patients_res.count is not None else len(patients_res.data or [])

        # Análisis totales
        analisis_res = supabase_client.table("analisis")\
            .select("id", count="exact")\
            .execute()
        total_analisis = analisis_res.count if analisis_res.count is not None else len(analisis_res.data or [])

        return {
            "totalDoctors": total_doctors,
            "totalPatients": total_patients,
            "totalAnalisis": total_analisis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")


# ─── GESTIÓN DE PACIENTES (CRUD) ─────────────────────────────────────────────

@router.get("/all-patients")
async def get_all_patients():
    """
    Obtiene TODOS los pacientes del sistema con info del médico asignado (bypass RLS).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        # Join pacientes con profiles para obtener el nombre del médico
        res = supabase_client.table("pacientes") \
            .select("*, medico:profiles!medico_id(id, nombre_completo)") \
            .order("nombre_completo") \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo pacientes: {str(e)}")


@router.post("/patients")
async def create_patient(patient: PatientCreate):
    """
    Crea un nuevo paciente y lo asigna a un médico (bypass RLS).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        res = supabase_client.table("pacientes").insert({
            "nombre_completo": patient.nombre_completo,
            "fecha_nacimiento": patient.fecha_nacimiento,
            "sexo": patient.sexo,
            "medico_id": patient.medico_id,
            "nombre_tutor": patient.nombre_tutor,
            "telefono_contacto": patient.telefono_contacto,
            "edad_gestacional": patient.edad_gestacional,
            "presentacion_nalgas": patient.presentacion_nalgas,
            "antecedente_familiar": patient.antecedente_familiar,
            "codigo_paciente": patient.codigo_paciente,
        }).select().single().execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando paciente: {str(e)}")


@router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient: PatientCreate):
    """
    Actualiza los datos de un paciente, incluida la reasignación de médico (bypass RLS).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        res = supabase_client.table("pacientes").update({
            "nombre_completo": patient.nombre_completo,
            "fecha_nacimiento": patient.fecha_nacimiento,
            "sexo": patient.sexo,
            "medico_id": patient.medico_id,
            "nombre_tutor": patient.nombre_tutor,
            "telefono_contacto": patient.telefono_contacto,
            "edad_gestacional": patient.edad_gestacional,
            "presentacion_nalgas": patient.presentacion_nalgas,
            "antecedente_familiar": patient.antecedente_familiar,
        }).eq("id", patient_id).select().single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        return {"status": "success", "data": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando paciente: {str(e)}")


@router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, background_tasks: BackgroundTasks):
    """
    Elimina un paciente y todos sus análisis asociados, luego re-sincroniza InfluxDB (bypass RLS).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        # 1. Borrar análisis del paciente primero (evita error de FK)
        supabase_client.table("analisis") \
            .delete() \
            .eq("paciente_id", patient_id) \
            .execute()

        # 2. Borrar el paciente
        res = supabase_client.table("pacientes") \
            .delete() \
            .eq("id", patient_id) \
            .execute()

        # 3. Re-sincronizar InfluxDB en background para eliminar su huella analítica
        try:
            from sync_supabase_to_influx import sync_data
            background_tasks.add_task(sync_data)
        except Exception as e:
            print(f"⚠️ Error al encolar re-sync tras borrado: {e}")

        return {"status": "success", "message": "Paciente y sus análisis eliminados correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando paciente: {str(e)}")


# ─── PRESCRIPCIONES DE REHABILITACIÓN ────────────────────────────────────────

@router.get("/prescriptions")
async def get_all_prescriptions():
    """
    Obtiene TODAS las prescripciones con datos del paciente y médico (bypass RLS).
    El join medico se hace en Python porque no hay FK explícita hacia profiles.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        presc_res = supabase_client.table("prescripciones_ejercicios") \
            .select("*, paciente:pacientes(id, nombre_completo, codigo_paciente)") \
            .order("creado_at", desc=True) \
            .execute()
        prescripciones = presc_res.data or []

        medicos_res = supabase_client.table("profiles") \
            .select("id, nombre_completo") \
            .eq("rol", "medico") \
            .execute()
        medicos_map = {m["id"]: m for m in (medicos_res.data or [])}

        for p in prescripciones:
            p["medico"] = medicos_map.get(p.get("medico_id"), {"id": p.get("medico_id"), "nombre_completo": "Desconocido"})

        return prescripciones
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo prescripciones: {str(e)}")


@router.delete("/prescriptions/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """
    Elimina una prescripción de ejercicio específica (bypass RLS).
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Cliente de Supabase no configurado")
    try:
        supabase_client.table("prescripciones_ejercicios") \
            .delete() \
            .eq("id", prescription_id) \
            .execute()
        return {"status": "success", "message": "Prescripción eliminada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando prescripción: {str(e)}")
