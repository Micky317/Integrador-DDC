import cv2
import math
import numpy as np
from ultralytics import YOLO

# Rutas
img_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints/Test/111qy.jpg'
modelo_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt'
output_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/reporte_medico_ddc.jpg'

def draw_beautiful_text(img, text, position, font_scale, text_color, bg_color):
    """ Dibuja texto médico con un recuadro de fondo super nítido y moderno """
    font = cv2.FONT_HERSHEY_DUPLEX
    thickness = 2
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    x, y = position
    
    # Dibujar HUD (fondo) semitransparente con borde
    overlay = img.copy()
    pad_x = 15
    pad_y = 15
    cv2.rectangle(overlay, (x - pad_x, y - text_height - pad_y), (x + text_width + pad_x, y + baseline + pad_y), bg_color, -1)
    # Borde sutil
    cv2.rectangle(overlay, (x - pad_x, y - text_height - pad_y), (x + text_width + pad_x, y + baseline + pad_y), (255, 255, 255), 1)
    
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    
    # Texto principal con un lligero contorno oscuro para que resalte más
    cv2.putText(img, text, (x, y), font, font_scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
    cv2.putText(img, text, (x, y), font, font_scale, text_color, thickness, cv2.LINE_AA)

def draw_angle_arc(img, center, pt1, pt2, color=(0, 255, 255), radius=50, start_angle=0, end_angle=45):
    """ Dibuja un arco semi-transparente para mostrar de dónde a dónde baja el ángulo """
    overlay = img.copy()
    cv2.ellipse(overlay, center, (radius, radius), 0, start_angle, end_angle, color, -1)
    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)

def calculate_angle(p1, p2, p3):
    """ Calcula el ángulo p1-p2-p3 """
    a = math.atan2(p1[1] - p2[1], p1[0] - p2[0]) - math.atan2(p3[1] - p2[1], p3[0] - p2[0])
    a = math.degrees(a)
    if a < 0: a += 360
    if a > 180: a = 360 - a
    return a

def draw_point(img, center, color, text):
    """ Dibuja un punto anatómico estilo 'Target' """
    cv2.circle(img, center, 8, (255, 255, 255), -1, cv2.LINE_AA) # Borde blanco
    cv2.circle(img, center, 5, color, -1, cv2.LINE_AA)           # Core al color
    # Letra pequeña al lado
    cv2.putText(img, text, (center[0] + 10, center[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

def main():
    print("Iniciando DDC Pasitos Firmes - Visualizador...")
    model = YOLO(modelo_path)
    results = model(img_path)
    img = cv2.imread(img_path)
    
    if hasattr(results[0], 'keypoints') and results[0].keypoints is not None:
        puntos = results[0].keypoints.xy[0].cpu().numpy()
        pts_validos = [p for p in puntos if not (p[0] == 0 and p[1] == 0)]
        pts_ordenados_x = sorted(pts_validos, key=lambda pts: pts[0])
        
        # Geometría: Izquierda de la imagen (Derecha médica), Derecha de la imagen (Izquierda médica)
        mitad_izquierda = pts_ordenados_x[:4]
        mitad_derecha = pts_ordenados_x[4:8]
        
        # Puntos Lado Izqui (Derecha Médica)
        techo_izq = (int(pts_ordenados_x[0][0]), int(pts_ordenados_x[0][1]))
        c_y_izq = (int(pts_ordenados_x[1][0]), int(pts_ordenados_x[1][1]))
        
        # Puntos Lado Derec (Izquierda Médica)
        c_y_der = (int(pts_ordenados_x[-2][0]), int(pts_ordenados_x[-2][1]))
        techo_der = (int(pts_ordenados_x[-1][0]), int(pts_ordenados_x[-1][1]))

        # COLORES CLÍNICOS (Más agradables) 
        COLOR_HILGENREINER = (250, 206, 135) # Celeste claro tipo cielo
        COLOR_PERKINS = (100, 100, 255)      # Rojo coral suave
        COLOR_ACETABULAR = (120, 255, 120)   # Verde neón claro

        # 1. HILGENREINER
        cv2.line(img, (0, c_y_izq[1]), (img.shape[1], c_y_der[1]), COLOR_HILGENREINER, 2, cv2.LINE_AA)
        
        # 2. PERKINS (perpendiculares a la inclinada de Hilgenreiner)
        x1, y1 = c_y_izq
        x2, y2 = c_y_der
        if x2 != x1:
            m = (y2 - y1) / (x2 - x1)
            x_top_izq = int(techo_izq[0] + m * techo_izq[1])
            x_bot_izq = int(techo_izq[0] - m * (img.shape[0] - techo_izq[1]))
            cv2.line(img, (x_top_izq, 0), (x_bot_izq, img.shape[0]), COLOR_PERKINS, 2, cv2.LINE_AA)

            x_top_der = int(techo_der[0] + m * techo_der[1])
            x_bot_der = int(techo_der[0] - m * (img.shape[0] - techo_der[1]))
            cv2.line(img, (x_top_der, 0), (x_bot_der, img.shape[0]), COLOR_PERKINS, 2, cv2.LINE_AA)
        else:
            cv2.line(img, (techo_izq[0], 0), (techo_izq[0], img.shape[0]), COLOR_PERKINS, 2, cv2.LINE_AA)
            cv2.line(img, (techo_der[0], 0), (techo_der[0], img.shape[0]), COLOR_PERKINS, 2, cv2.LINE_AA)

        # 3. TECHO ACETABULAR
        cv2.line(img, c_y_izq, techo_izq, COLOR_ACETABULAR, 3, cv2.LINE_AA)
        cv2.line(img, c_y_der, techo_der, COLOR_ACETABULAR, 3, cv2.LINE_AA)

        # PUNTOS
        draw_point(img, c_y_izq, (255, 0, 0), " Y")
        draw_point(img, c_y_der, (255, 0, 0), " Y")
        draw_point(img, techo_izq, (0, 255, 255), " TB")
        draw_point(img, techo_der, (0, 255, 255), " TB")

        # CÁLCULOS ESTRICTOS
        p_horizontal_izq = (techo_izq[0], c_y_izq[1]) 
        angulo_izq = calculate_angle(techo_izq, c_y_izq, p_horizontal_izq)
        
        p_horizontal_der = (techo_der[0], c_y_der[1])
        angulo_der = calculate_angle(techo_der, c_y_der, p_horizontal_der)
        
        # Dibujo de Arcos
        draw_angle_arc(img, c_y_izq, techo_izq, p_horizontal_izq, color=(0, 255, 0), radius=60, start_angle=180, end_angle=180+angulo_izq*1.2)
        draw_angle_arc(img, c_y_der, techo_der, p_horizontal_der, color=(0, 255, 0), radius=60, start_angle=360-angulo_der*1.2, end_angle=360)

        # Estados Clínicos
        st_izq = "NORMAL" if angulo_izq < 28 else ("LIMITROFE" if angulo_izq < 30 else "DISPLASIA")
        st_der = "NORMAL" if angulo_der < 28 else ("LIMITROFE" if angulo_der < 30 else "DISPLASIA")
        c_izq = (100, 255, 100) if st_izq == "NORMAL" else (100, 100, 255)
        c_der = (100, 255, 100) if st_der == "NORMAL" else (100, 100, 255)

        # ================== HUD PRINCIPAL ==================
        y_offset = 60
        
        # LADO IZQUIERDO DE LA IMAGEN = ¡CADERA DERECHA PACIENTE! (Corregido)
        draw_beautiful_text(img, "RX: CADERA DERECHA", (20, y_offset), 0.8, (255, 200, 50), (30, 30, 30))
        draw_beautiful_text(img, f"Ang. Alfa: {angulo_izq:.1f} grados", (20, y_offset + 50), 0.7, c_izq, (30, 30, 30))
        draw_beautiful_text(img, f"DX: {st_izq}", (20, y_offset + 100), 0.7, c_izq, (30, 30, 30))

        # LADO DERECHO DE LA IMAGEN = ¡CADERA IZQUIERDA PACIENTE! (Corregido)
        x_right = img.shape[1] - 420
        draw_beautiful_text(img, "RX: CADERA IZQUIERDA", (x_right, y_offset), 0.8, (255, 200, 50), (30, 30, 30))
        draw_beautiful_text(img, f"Ang. Alfa: {angulo_der:.1f} grados", (x_right, y_offset + 50), 0.7, c_der, (30, 30, 30))
        draw_beautiful_text(img, f"DX: {st_der}", (x_right, y_offset + 100), 0.7, c_der, (30, 30, 30))

        # Título General más limpio
        draw_beautiful_text(img, "DDC PASITOS FIRMES - ANALISIS IA", (int(img.shape[1]/2) - 260, 40), 1.0, (255, 255, 255), (60, 20, 20))

    cv2.imwrite(output_path, img)
    print("Visualización mejorada lista!")

if __name__ == "__main__":
    main()
