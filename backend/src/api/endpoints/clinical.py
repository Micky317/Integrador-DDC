from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import cv2
import numpy as np
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

@router.post("/decode-qr")
async def decode_qr_endpoint(file: UploadFile = File(...)):
    """
    Recibe una imagen y decodifica el código QR utilizando OpenCV.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen.")
            
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(img)
        
        # Si no lo encuentra, intentamos convertir a escala de grises para mejorar contraste
        if not data:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            data, bbox, _ = detector.detectAndDecode(gray)
            
        if not data:
            raise HTTPException(status_code=404, detail="No se encontró ningún código QR en la imagen.")
            
        return {"status": "success", "data": data}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el código QR: {str(e)}")
