from typing import Optional
import json
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Importaciones modulares con Arquitectura Limpia
from src.schemas import HealthCheck, AnalysisResult, KeyPoint
from src.core.logic import get_diagnostico
from src.ai.model_loader import model_instance
from src.utils.drawing import annotate_image, image_to_base64

load_dotenv()

# ============================================================
# INICIALIZACIÓN DEL SERVIDOR
# ============================================================
app = FastAPI(
    title="DDC Pasitos Firmes — API de Análisis IA",
    description="Backend FastAPI modularizado para el cálculo de ángulos acetabulares.",
    version="2.0.0" # Bumped version for refactor
)

# CORS abierto para permitir peticiones desde la app Expo y web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/", response_model=HealthCheck)
async def health_check():
    """Verifica que el servidor y el modelo estén activos."""
    return HealthCheck(
        status="ok",
        modelo_cargado=model_instance is not None,
        version="2.0.0"
    )

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_radiography(file: UploadFile = File(...)):
    """
    Recibe una imagen JPG/PNG de una radiografía de cadera.
    Devuelve los ángulos acetabulares, diagnóstico clínico e imagen anotada.
    """
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Modelo de IA no disponible")

    # Validar tipo de archivo
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes JPG o PNG")

    # Leer imagen desde los bytes recibidos
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar")
    except Exception:
        raise HTTPException(status_code=400, detail="Error al procesar el archivo de imagen")

    # Inferencia YOLO
    try:
        results = model_instance(img, verbose=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en inferencia de IA: {str(e)}")

    if not results or results[0].keypoints is None:
        raise HTTPException(status_code=422, detail="No se detectaron estructuras anatómicas en la imagen")

    puntos = results[0].keypoints.xy[0].cpu().numpy()

    if len(puntos) < 6:
        raise HTTPException(status_code=422, detail="Puntos insuficientes detectados. Verifique la calidad de la radiografía.")

    # Mapear los puntos para enviarlos al Frontend
    claves: list[KeyPoint] = []
    labels_map = {
        0: "Techo Der", 1: "Cartílago Der", 2: "Pubis Der", 3: "Ilion Der",
        4: "Techo Izq", 5: "Cartílago Izq", 6: "Pubis Izq", 7: "Ilion Izq"
    }
    for idx, label in labels_map.items():
        if idx < len(puntos):
            claves.append(KeyPoint(id=idx, label=label, x=float(puntos[idx][0]), y=float(puntos[idx][1])))

    # Anotar la imagen y calcular ángulos
    img_anotada, angulo_izq, angulo_der = annotate_image(img.copy(), puntos)

    return AnalysisResult(
        angulo_izquierda=round(angulo_izq, 2),
        angulo_derecha=round(angulo_der, 2),
        diagnostico_izquierda=get_diagnostico(angulo_izq),
        diagnostico_derecha=get_diagnostico(angulo_der),
        imagen_anotada_base64=image_to_base64(img_anotada),
        puntos_clave=claves
    )

@app.post("/recalculate", response_model=AnalysisResult)
async def recalculate_radiography(
    file: UploadFile = File(...),
    puntos_json: str = Form(...)  # Array JSON de KeyPoint
):
    """
    Recibe la radiografía original y los puntos ajustados manualmente.
    Re-dibuja y re-calcula todo sin pasar por la IA.
    """
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes JPG o PNG")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    try:
        modificados = json.loads(puntos_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato JSON inválido para puntos_json")

    # Reconstruir array de puntos
    puntos = np.zeros((8, 2), dtype=np.float32)
    claves: list[KeyPoint] = []
    
    for obj in modificados:
        idx = int(obj.get("id", 0))
        x = float(obj.get("x", 0))
        y = float(obj.get("y", 0))
        label = obj.get("label", "Desconocido")
        if idx < 8:
            puntos[idx][0] = x
            puntos[idx][1] = y
            claves.append(KeyPoint(id=idx, label=label, x=x, y=y))

    # Anotar y calcular de nuevo usando la lógica modular
    img_anotada, angulo_izq, angulo_der = annotate_image(img.copy(), puntos)

    return AnalysisResult(
        angulo_izquierda=round(angulo_izq, 2),
        angulo_derecha=round(angulo_der, 2),
        diagnostico_izquierda=get_diagnostico(angulo_izq),
        diagnostico_derecha=get_diagnostico(angulo_der),
        imagen_anotada_base64=image_to_base64(img_anotada),
        puntos_clave=claves
    )
