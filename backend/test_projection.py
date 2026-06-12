import os
import sys
from pprint import pprint

# Agregar src al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services.projection import generate_patient_projection, get_population_treatment_rates

def test_projection_service():
    print("Testing population rates extraction...")
    rates = get_population_treatment_rates()
    print("Population Rates calculated (tuple_key -> (avg_rate, count)):")
    pprint(rates)
    
    print("\nTesting patient projection...")
    # Usando el paciente de prueba Bebé Juanito Perez
    paciente_id = "e1b9b6a8-6482-4121-883b-786d6af70412"
    proj = generate_patient_projection(paciente_id, granularity="meses")
    
    if "error" in proj:
        print(f"❌ Error en la proyección: {proj['error']}")
    else:
        print(f"✅ Proyección exitosa para {proj['nombre_completo']}:")
        print(f"   Edad actual: {proj['edad_actual_meses']} meses")
        print(f"   Tratamientos asignados: {proj['tratamientos_activos']}")
        print(f"   Última medición: {proj['ultima_medicion']}")
        print(f"   Factor de respuesta individual (Gamma): {proj['factor_respuesta_paciente']}")
        print(f"   Tasa mensual efectiva: {proj['tasa_tratamiento_mensual']} grados/mes")
        print(f"   Meses para alcanzar meta (<28°): {proj['meses_para_meta']}")
        print("\nProyección cadera Izquierda (primeros 3 puntos):")
        pprint(proj['proyeccion_izq'][:3])
        print("\nProyección cadera Derecha (primeros 3 puntos):")
        pprint(proj['proyeccion_der'][:3])

if __name__ == "__main__":
    test_projection_service()
