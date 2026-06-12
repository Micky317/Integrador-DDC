from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.analytics_service import analytics

router = APIRouter()

class ClinicalEvent(BaseModel):
    paciente_id: str
    medico_id: str = ""
    angulo_izq: float
    angulo_der: float
    dx_izq: str = ""
    dx_der: str = ""
    categoria_graf: str = ""
    timestamp: str = None

@router.post("/event")
async def register_clinical_event(event: ClinicalEvent):
    """
    Registra un evento clínico (análisis de radiografía) en InfluxDB.
    """
    try:
        analytics.log_clinical_event(
            paciente_id=event.paciente_id,
            medico_id=event.medico_id,
            angulo_izq=event.angulo_izq,
            angulo_der=event.angulo_der,
            tecnica_correcta=True, # Placeholder para radiografías
            dx_izq=event.dx_izq,
            dx_der=event.dx_der,
            categoria_graf=event.categoria_graf,
            timestamp=event.timestamp
        )
        return {"status": "success", "message": "Evento registrado en InfluxDB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registrando en InfluxDB: {str(e)}")

@router.post("/sync")
async def trigger_synchronization():
    """
    Sincroniza todos los análisis desde Supabase hacia InfluxDB de manera manual/bajo demanda.
    """
    try:
        from sync_supabase_to_influx import sync_data
        sync_data()
        return {"status": "success", "message": "Datos sincronizados correctamente con InfluxDB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la sincronización: {str(e)}")

@router.get("/pacientes/{id}/proyeccion")
async def get_patient_projection(id: str, granularity: str = "meses"):
    """
    Retorna la proyección dinámica del paciente basada en su edad, historial, tratamientos y cumplimiento.
    """
    try:
        from src.services.projection import generate_patient_projection
        res = generate_patient_projection(id, granularity=granularity)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al calcular la proyección: {str(e)}")
