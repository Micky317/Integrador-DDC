import cv2
import numpy as np
import base64
import math
import tempfile
import os
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from src.ai.model_loader import model_instance
from src.schemas import AnalysisResult, KeyPoint
from src.analytics_service import analytics
from typing import Optional

router = APIRouter()

# --- Funciones Auxiliares de Dibujo ---
def draw_beautiful_text(img, text, position, font_scale, text_color, bg_color):
    font = cv2.FONT_HERSHEY_DUPLEX
    thickness = 2
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    x, y = position
    overlay = img.copy()
    pad_x, pad_y = 15, 15
    cv2.rectangle(overlay, (x - pad_x, y - text_height - pad_y), (x + text_width + pad_x, y + baseline + pad_y), bg_color, -1)
    cv2.rectangle(overlay, (x - pad_x, y - text_height - pad_y), (x + text_width + pad_x, y + baseline + pad_y), (255, 255, 255), 1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    cv2.putText(img, text, (x, y), font, font_scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
    cv2.putText(img, text, (x, y), font, font_scale, text_color, thickness, cv2.LINE_AA)

def draw_angle_arc(img, center, radius=60, start_angle=0, end_angle=45, color=(0, 255, 0)):
    overlay = img.copy()
    cv2.ellipse(overlay, center, (radius, radius), 0, start_angle, end_angle, color, -1)
    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)

def draw_point(img, center, color, text):
    cv2.circle(img, center, 8, (255, 255, 255), -1, cv2.LINE_AA)
    cv2.circle(img, center, 5, color, -1, cv2.LINE_AA)
    cv2.putText(img, text, (center[0] + 10, center[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

def calculate_acetabular_angle(p_techo, p_cartilago):
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001
    return math.degrees(math.atan2(dy, dx))

# --- Core Lógico (Compartido) ---
def _generar_reporte_clinico(img: np.ndarray, puntos: np.ndarray, pacienteId: Optional[str]) -> AnalysisResult:
    """ Genera la imagen anotada y los cálculos clínicos basados en los puntos anatómicos """
    # Mapeo estricto de YOLO (sin ordenamiento espacial)
    techo_izq = (int(puntos[0][0]), int(puntos[0][1]))
    c_y_izq   = (int(puntos[1][0]), int(puntos[1][1]))
    techo_der = (int(puntos[4][0]), int(puntos[4][1]))
    c_y_der   = (int(puntos[5][0]), int(puntos[5][1]))

    if techo_izq == (0,0) or c_y_izq == (0,0) or techo_der == (0,0) or c_y_der == (0,0):
        raise HTTPException(status_code=422, detail="Falta visibilidad de un cartílago o techo.")

    # Cálculos de ángulos
    angulo_izq = calculate_acetabular_angle(techo_izq, c_y_izq)
    angulo_der = calculate_acetabular_angle(techo_der, c_y_der)

    p_horizontal_izq = (techo_izq[0], c_y_izq[1]) 
    p_horizontal_der = (techo_der[0], c_y_der[1])

    # Diagnósticos
    st_izq = "NORMAL" if angulo_izq < 28 else ("LIMITROFE" if angulo_izq < 30 else "DISPLASIA")
    st_der = "NORMAL" if angulo_der < 28 else ("LIMITROFE" if angulo_der < 30 else "DISPLASIA")
    c_izq = (100, 255, 100) if st_izq == "NORMAL" else (100, 100, 255)
    c_der = (100, 255, 100) if st_der == "NORMAL" else (100, 100, 255)

    # DIBUJO ORIGINAL DE WEBAPP.PY
    cv2.line(img, (0, c_y_izq[1]), (img.shape[1], c_y_der[1]), (250, 206, 135), 2, cv2.LINE_AA)
    draw_point(img, c_y_izq, (255, 0, 0), " Y")
    draw_point(img, c_y_der, (255, 0, 0), " Y")
    cv2.line(img, (techo_izq[0], 0), (techo_izq[0], img.shape[0]), (100, 100, 255), 2, cv2.LINE_AA)
    cv2.line(img, (techo_der[0], 0), (techo_der[0], img.shape[0]), (100, 100, 255), 2, cv2.LINE_AA)
    draw_point(img, techo_izq, (0, 255, 255), " TB")
    draw_point(img, techo_der, (0, 255, 255), " TB")

    cv2.line(img, c_y_izq, techo_izq, (120, 255, 120), 4, cv2.LINE_AA)
    cv2.line(img, c_y_der, techo_der, (120, 255, 120), 4, cv2.LINE_AA)
    draw_angle_arc(img, c_y_izq, radius=60, start_angle=180, end_angle=180+angulo_izq*1.2, color=(0, 255, 0))
    draw_angle_arc(img, c_y_der, radius=60, start_angle=360-angulo_der*1.2, end_angle=360, color=(0, 255, 0))

    # HUD Médico Final (Parte inferior)
    h = img.shape[0]
    y_offset = h - 140

    draw_beautiful_text(img, "CADERA DERECHA (RX)", (20, y_offset), 0.75, (255, 200, 50), (20, 20, 20))
    draw_beautiful_text(img, f"Alfa: {angulo_izq:.1f}  |  DX: {st_izq}", (20, y_offset + 45), 0.75, c_izq, (20, 20, 20))

    x_right = img.shape[1] - 410
    if x_right < 300: x_right = int(img.shape[1] / 2) + 20

    draw_beautiful_text(img, "CADERA IZQUIERDA (RX)", (x_right, y_offset), 0.75, (255, 200, 50), (20, 20, 20))
    draw_beautiful_text(img, f"Alfa: {angulo_der:.1f}  |  DX: {st_der}", (x_right, y_offset + 45), 0.75, c_der, (20, 20, 20))

    titulo = "DDC Pasitos Firmes - IA"
    (tw, th), _ = cv2.getTextSize(titulo, cv2.FONT_HERSHEY_DUPLEX, 0.8, 2)
    tx = int((img.shape[1] - tw) / 2)
    ty = img.shape[0] - 15
    draw_beautiful_text(img, titulo, (tx, ty), 0.8, (255, 255, 255), (60, 20, 20))

    # El registro de eventos clínicos en InfluxDB se realiza al guardar el análisis (vía /clinical/event)
    # y no durante el análisis temporal/AI para evitar duplicidad y desajuste de fechas.
    # if pacienteId:
    #     analytics.log_clinical_event(paciente_id=pacienteId, angulo_izq=round(angulo_izq, 2), angulo_der=round(angulo_der, 2), tecnica_correcta=True)

    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    # Convertimos los puntos de numpy a los modelos Pydantic
    keypoints_list = [KeyPoint(id=i, label=f"KP_{i}", x=float(p[0]), y=float(p[1])) for i, p in enumerate(puntos) if np.any(p)]

    return AnalysisResult(
        angulo_izquierda=round(angulo_izq, 2), angulo_derecha=round(angulo_der, 2),
        diagnostico_izquierda=st_izq, diagnostico_derecha=st_der,
        imagen_anotada_base64=img_base64, puntos_clave=keypoints_list
    )

# --- Endpoints ---

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_xray(
    file: UploadFile = File(...),
    pacienteId: Optional[str] = Form(None)
):
    if model_instance is None:
        raise HTTPException(status_code=500, detail="Modelo de IA no cargado.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: raise HTTPException(status_code=400, detail="Imagen inválida.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    results = model_instance(tmp_path, verbose=False)
    os.remove(tmp_path)

    if not results or results[0].keypoints is None:
         raise HTTPException(status_code=422, detail="No se detectaron puntos clave.")

    puntos = results[0].keypoints.xy[0].cpu().numpy()
    if len(puntos) < 6:
         raise HTTPException(status_code=422, detail="La IA no detectó suficientes puntos (mínimo 6).")

    return _generar_reporte_clinico(img, puntos, pacienteId)

@router.post("/recalculate", response_model=AnalysisResult)
async def recalculate_radiography(
    file: UploadFile = File(...),
    puntos_json: str = Form(...) 
):
    """
    Recalcula los ángulos y diagnósticos sin usar IA, basándose en los puntos
    enviados (ajustados manualmente por el médico en la App).
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: raise HTTPException(status_code=400, detail="Imagen inválida.")

    try:
        modificados = json.loads(puntos_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato JSON inválido para puntos.")

    # Reconstruir array de puntos como lo entregaría YOLO (shape 6x2 o mayor)
    max_id = max([int(obj.get("id", 0)) for obj in modificados], default=5)
    size = max(max_id + 1, 6)
    
    puntos = np.zeros((size, 2), dtype=np.float32)
    
    for obj in modificados:
        idx = int(obj.get("id", 0))
        x = float(obj.get("x", 0))
        y = float(obj.get("y", 0))
        puntos[idx][0] = x
        puntos[idx][1] = y

    # Generamos el mismo reporte visual, pero con los puntos inyectados manualmente
    return _generar_reporte_clinico(img, puntos, None)
