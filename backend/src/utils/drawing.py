import cv2
import numpy as np
import base64
from src.core.logic import calculate_acetabular_angle, get_diagnostico

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

    x1, y1 = c_y_izq
    x2, y2 = c_y_der
    
    if x2 != x1:
        m = (y2 - y1) / (x2 - x1)
        y_start = int(y1 - m * x1)
        y_end = int(y1 + m * (w - x1))
        deg_H = math.degrees(math.atan2(y2 - y1, x2 - x1))
    else:
        y_start = y1
        y_end = y2
        deg_H = 0.0

    # 1. Línea de Hilgenreiner (pasando exactamente por ambos cartílagos Y)
    cv2.line(img, (0, y_start), (w, y_end), (250, 206, 135), 2, cv2.LINE_AA)

    # 2. Líneas de Perkins (perpendiculares a Hilgenreiner, rojo suave)
    if x2 != x1:
        x_top_izq = int(techo_izq[0] + m * techo_izq[1])
        x_bot_izq = int(techo_izq[0] - m * (h - techo_izq[1]))
        cv2.line(img, (x_top_izq, 0), (x_bot_izq, h), (100, 100, 255), 2, cv2.LINE_AA)

        x_top_der = int(techo_der[0] + m * techo_der[1])
        x_bot_der = int(techo_der[0] - m * (h - techo_der[1]))
        cv2.line(img, (x_top_der, 0), (x_bot_der, h), (100, 100, 255), 2, cv2.LINE_AA)
    else:
        cv2.line(img, (0, techo_izq[1]), (w, techo_izq[1]), (100, 100, 255), 2, cv2.LINE_AA)
        cv2.line(img, (0, techo_der[1]), (w, techo_der[1]), (100, 100, 255), 2, cv2.LINE_AA)

    # 3. Techo acetabular (verde, más grueso)
    cv2.line(img, c_y_izq, techo_izq, (100, 230, 100), 3, cv2.LINE_AA)
    cv2.line(img, c_y_der, techo_der, (100, 230, 100), 3, cv2.LINE_AA)

    # 4. Puntos anatómicos
    draw_point(img, c_y_izq,   (0, 50, 255), " Y")
    draw_point(img, c_y_der,   (0, 50, 255), " Y")
    draw_point(img, techo_izq, (0, 230, 230), " TB")
    draw_point(img, techo_der, (0, 230, 230), " TB")

    # 5. Cálculo de ángulos (alineados con la inclinación de Hilgenreiner)
    ref_izq = 180 + deg_H
    deg_R_izq = math.degrees(math.atan2(techo_izq[1] - c_y_izq[1], techo_izq[0] - c_y_izq[0]))
    ref_izq_norm = (ref_izq + 360) % 360
    deg_R_izq_norm = (deg_R_izq + 360) % 360
    diff_izq = abs(deg_R_izq_norm - ref_izq_norm)
    if diff_izq > 180:
        diff_izq = 360 - diff_izq
    angulo_izq = diff_izq

    ref_der = deg_H
    deg_R_der = math.degrees(math.atan2(techo_der[1] - c_y_der[1], techo_der[0] - c_y_der[0]))
    ref_der_norm = (ref_der + 360) % 360
    deg_R_der_norm = (deg_R_der + 360) % 360
    diff_der = abs(deg_R_der_norm - ref_der_norm)
    if diff_der > 180:
        diff_der = 360 - diff_der
    angulo_der = diff_der

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
