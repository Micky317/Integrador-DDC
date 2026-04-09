import math
import base64
import io
import os
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# ============================================================
# INICIALIZACIÓN DEL SERVIDOR Y CARGA DEL MODELO (UNA VEZ)
# ============================================================
app = FastAPI(
    title="DDC Pasitos Firmes — API de Análisis IA",
    description="Backend FastAPI que recibe radiografías de cadera y retorna ángulos acetabulares calculados con YOLOv8 Pose.",
    version="1.0.0"
)

# CORS abierto para permitir peticiones desde la app Expo y web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar el modelo YOLO una sola vez al arrancar el servidor
MODEL_PATH = os.getenv(
    "MODEL_PATH",
    str(Path(__file__).parent.parent / "MTDDH/runs/pose/ddh_pose_model/weights/best.pt")
)

print(f"Cargando modelo desde: {MODEL_PATH}")
try:
    model = YOLO(MODEL_PATH)
    print("✅ Modelo YOLOv8 Pose cargado exitosamente.")
except Exception as e:
    print(f"❌ Error al cargar modelo: {e}")
    model = None

# ============================================================
# MODELOS DE RESPUESTA (Pydantic)
# ============================================================
class KeyPoint(BaseModel):
    id: int
    label: str
    x: float
    y: float

class AnalysisResult(BaseModel):
    angulo_izquierda: float
    angulo_derecha: float
    diagnostico_izquierda: str   # NORMAL | LIMITROFE | DISPLASIA
    diagnostico_derecha: str
    imagen_anotada_base64: str   # La imagen con líneas dibujadas en base64
    puntos_clave: list[KeyPoint]

class HealthCheck(BaseModel):
    status: str
    modelo_cargado: bool
    version: str

# ============================================================
# FUNCIONES MATEMÁTICAS Y DE DIBUJO
# ============================================================
def calculate_acetabular_angle(p_techo: tuple, p_cartilago: tuple) -> float:
    """Calcula el ángulo acetabular (Índice Alfa) entre el techo y el cartílago trirradiado."""
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001  # Evita división por cero
    return math.degrees(math.atan2(dy, dx))

def get_diagnostico(angulo: float) -> str:
    """Retorna el diagnóstico clínico según los umbrales médicos estándar."""
    if angulo < 28.0:
        return "NORMAL"
    elif angulo < 30.0:
        return "LIMITROFE"
    else:
        return "DISPLASIA"

def draw_text_hud(img: np.ndarray, text: str, pos: tuple, color: tuple, bg=(20, 20, 20)):
    """Dibuja texto médico con fondo semitransparente."""
    font = cv2.FONT_HERSHEY_DUPLEX
    scale, thickness = 0.75, 2
    (tw, th), bl = cv2.getTextSize(text, font, scale, thickness)
    x, y = pos
    overlay = img.copy()
    cv2.rectangle(overlay, (x - 8, y - th - 8), (x + tw + 8, y + bl + 8), bg, -1)
    cv2.rectangle(overlay, (x - 8, y - th - 8), (x + tw + 8, y + bl + 8), (255, 255, 255), 1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    cv2.putText(img, text, pos, font, scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
    cv2.putText(img, text, pos, font, scale, color, thickness, cv2.LINE_AA)

def draw_point(img: np.ndarray, center: tuple, color: tuple, label: str):
    """Dibuja un punto anatómico estilo 'target' con etiqueta."""
    cv2.circle(img, center, 8, (255, 255, 255), -1, cv2.LINE_AA)
    cv2.circle(img, center, 5, color, -1, cv2.LINE_AA)
    cv2.putText(img, label, (center[0] + 10, center[1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

def annotate_image(img: np.ndarray, puntos: np.ndarray) -> tuple[np.ndarray, float, float]:
    """
    Dibuja todas las líneas médicas en la imagen y retorna la imagen anotada + ángulos.
    Índices del modelo:
      0 = Techo Acetabular Derecho del paciente (izq de foto)
      1 = Cartílago Trirradiado Y Derecho (izq de foto)  
      4 = Techo Acetabular Izquierdo del paciente (der de foto)
      5 = Cartílago Trirradiado Y Izquierdo (der de foto)
    """
    techo_izq = (int(puntos[0][0]), int(puntos[0][1]))
    c_y_izq   = (int(puntos[1][0]), int(puntos[1][1]))
    techo_der = (int(puntos[4][0]), int(puntos[4][1]))
    c_y_der   = (int(puntos[5][0]), int(puntos[5][1]))

    h, w = img.shape[:2]

    # 1. Línea de Hilgenreiner (horizontal, celeste)
    cv2.line(img, (0, c_y_izq[1]), (w, c_y_der[1]), (250, 206, 135), 2, cv2.LINE_AA)

    # 2. Líneas de Perkins (verticales, rojo suave)
    cv2.line(img, (techo_izq[0], 0), (techo_izq[0], h), (100, 100, 255), 2, cv2.LINE_AA)
    cv2.line(img, (techo_der[0], 0), (techo_der[0], h), (100, 100, 255), 2, cv2.LINE_AA)

    # 3. Techo acetabular (verde, más grueso)
    cv2.line(img, c_y_izq, techo_izq, (100, 230, 100), 3, cv2.LINE_AA)
    cv2.line(img, c_y_der, techo_der, (100, 230, 100), 3, cv2.LINE_AA)

    # 4. Puntos anatómicos
    draw_point(img, c_y_izq,   (0, 50, 255), " Y")
    draw_point(img, c_y_der,   (0, 50, 255), " Y")
    draw_point(img, techo_izq, (0, 230, 230), " TB")
    draw_point(img, techo_der, (0, 230, 230), " TB")

    # 5. Cálculo de ángulos
    angulo_izq = calculate_acetabular_angle(techo_izq, c_y_izq)
    angulo_der = calculate_acetabular_angle(techo_der, c_y_der)

    dx_izq = get_diagnostico(angulo_izq)
    dx_der = get_diagnostico(angulo_der)

    color_izq = (100, 255, 100) if dx_izq == "NORMAL" else (100, 100, 255)
    color_der = (100, 255, 100) if dx_der == "NORMAL" else (100, 100, 255)

    # 6. HUD inferior (para no tapar las líneas centrales)
    y_hud = h - 140
    draw_text_hud(img, "CADERA DERECHA (RX)", (20, y_hud),          (255, 200, 50))
    draw_text_hud(img, f"Alfa: {angulo_izq:.1f}  DX: {dx_izq}",    (20, y_hud + 48), color_izq)

    x_right = max(w - 410, int(w / 2) + 20)
    draw_text_hud(img, "CADERA IZQUIERDA (RX)", (x_right, y_hud),         (255, 200, 50))
    draw_text_hud(img, f"Alfa: {angulo_der:.1f}  DX: {dx_der}",           (x_right, y_hud + 48), color_der)

    # 7. Título centrado abajo
    titulo = "DDC Pasitos Firmes - IA"
    (tw, _), _ = cv2.getTextSize(titulo, cv2.FONT_HERSHEY_DUPLEX, 0.8, 2)
    draw_text_hud(img, titulo, (int((w - tw) / 2), h - 15), (255, 255, 255), bg=(60, 20, 20))

    return img, angulo_izq, angulo_der

def image_to_base64(img: np.ndarray) -> str:
    """Convierte una imagen numpy (BGR) a base64 JPEG."""
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return base64.b64encode(buffer).decode('utf-8')

# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/", response_model=HealthCheck)
async def health_check():
    """Verifica que el servidor y el modelo estén activos."""
    return HealthCheck(
        status="ok",
        modelo_cargado=model is not None,
        version="1.0.0"
    )

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_radiography(file: UploadFile = File(...)):
    """
    Recibe una imagen JPG/PNG de una radiografía de cadera.
    Devuelve los ángulos acetabulares, diagnóstico clínico e imagen anotada en base64.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo de IA no disponible")

    # Validar tipo de archivo
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes JPG o PNG")

    # Leer imagen desde los bytes recibidos
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    # Inferencia YOLO
    results = model(img, verbose=False)

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

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    try:
        modificados = json.loads(puntos_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Formato JSON inválido para puntos_json")

    # Reconstruir array de forma parecida a YOLO (8 puntos max)
    # Rellenamos de 0 por seguridad
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

    # Anotar y calcular de nuevo
    img_anotada, angulo_izq, angulo_der = annotate_image(img.copy(), puntos)

    return AnalysisResult(
        angulo_izquierda=round(angulo_izq, 2),
        angulo_derecha=round(angulo_der, 2),
        diagnostico_izquierda=get_diagnostico(angulo_izq),
        diagnostico_derecha=get_diagnostico(angulo_der),
        imagen_anotada_base64=image_to_base64(img_anotada),
        puntos_clave=claves
    )
