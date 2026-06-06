import os
import cv2
import tempfile
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from src.schemas import VideoAnalysisResult
from src.analytics_service import analytics

router = APIRouter()

@router.post("/video-analysis", response_model=VideoAnalysisResult)
async def analyze_video(
    paciente_id: str = Form(...),
    video: UploadFile = File(...)
):
    """
    Endpoint para analizar el video de la técnica de rehabilitación.
    """
    try:
        # 1. Guardar video temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
            temp_video.write(await video.read())
            temp_path = temp_video.name

        # 2. Procesamiento de video (Placeholder de IA)
        cap = cv2.VideoCapture(temp_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Simulación de cálculo clínico (ambas piernas)
        mock_angle_izq = 25.0
        mock_angle_der = 27.5
        tecnica_correcta = (mock_angle_izq < 30) and (mock_angle_der < 30)
        
        cap.release()
        os.remove(temp_path)

        # 3. Registrar en Analítica (InfluxDB) - AMBAS PIERNAS
        analytics.log_clinical_event(
            paciente_id=paciente_id,
            angulo_izq=mock_angle_izq,
            angulo_der=mock_angle_der,
            tecnica_correcta=tecnica_correcta
        )

        return VideoAnalysisResult(
            tecnica_correcta=tecnica_correcta,
            confianza=0.92,
            feedback=f"Ángulos detectados - IZQ: {mock_angle_izq}°, DER: {mock_angle_der}°. Técnica correcta.",
            frames_procesados=frame_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analizando video: {str(e)}")
