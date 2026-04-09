import gradio as gr
import cv2
import math
import numpy as np
from ultralytics import YOLO

modelo_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt'
model = YOLO(modelo_path)

def draw_beautiful_text(img, text, position, font_scale, text_color, bg_color):
    font = cv2.FONT_HERSHEY_DUPLEX
    thickness = 2
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    x, y = position
    overlay = img.copy()
    pad = 10
    cv2.rectangle(overlay, (x - pad, y - text_height - pad), (x + text_width + pad, y + baseline + pad), bg_color, -1)
    cv2.rectangle(overlay, (x - pad, y - text_height - pad), (x + text_width + pad, y + baseline + pad), (255, 255, 255), 1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    cv2.putText(img, text, (x, y), font, font_scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
    cv2.putText(img, text, (x, y), font, font_scale, text_color, thickness, cv2.LINE_AA)

def draw_angle_arc(img, center, pt1, pt2, color=(0, 255, 255), radius=50, start_angle=0, end_angle=45):
    overlay = img.copy()
    cv2.ellipse(overlay, center, (radius, radius), 0, start_angle, end_angle, color, -1)
    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)

def calculate_acetabular_angle(p_techo, p_cartilago):
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001
    angulo = math.degrees(math.atan2(dy, dx))
    return angulo

def draw_point(img, center, color, text):
    cv2.circle(img, center, 8, (255, 255, 255), -1, cv2.LINE_AA)
    cv2.circle(img, center, 5, color, -1, cv2.LINE_AA)
    cv2.putText(img, text, (center[0] + 10, center[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

def analizar_radiografia(imagen_rgb, filtros):
    if imagen_rgb is None:
        return None
    
    img = cv2.cvtColor(imagen_rgb, cv2.COLOR_RGB2BGR)
    results = model(img, verbose=False)
    
    if hasattr(results[0], 'keypoints') and results[0].keypoints is not None:
        puntos = results[0].keypoints.xy[0].cpu().numpy()
        pts_validos = [p for p in puntos if not (p[0] == 0 and p[1] == 0)]
        
        if len(puntos) < 6:
            draw_beautiful_text(img, "Error: No se detectaron suficientes puntos", (50, 50), 0.8, (0,0,255), (0,0,0))
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
        techo_izq = (int(puntos[0][0]), int(puntos[0][1]))
        c_y_izq = (int(puntos[1][0]), int(puntos[1][1]))
        
        techo_der = (int(puntos[4][0]), int(puntos[4][1]))
        c_y_der = (int(puntos[5][0]), int(puntos[5][1]))

        if techo_izq == (0,0) or c_y_izq == (0,0) or techo_der == (0,0) or c_y_der == (0,0):
             draw_beautiful_text(img, "Falta visibilidad de un cartílago o techo", (50, 50), 0.8, (0,0,255), (0,0,0))
             return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if "Líneas Clínicas Base (H&P)" in filtros:
            cv2.line(img, (0, c_y_izq[1]), (img.shape[1], c_y_der[1]), (250, 206, 135), 2, cv2.LINE_AA)
            draw_point(img, c_y_izq, (255, 0, 0), " Y")
            draw_point(img, c_y_der, (255, 0, 0), " Y")
            cv2.line(img, (techo_izq[0], 0), (techo_izq[0], img.shape[0]), (100, 100, 255), 2, cv2.LINE_AA)
            cv2.line(img, (techo_der[0], 0), (techo_der[0], img.shape[0]), (100, 100, 255), 2, cv2.LINE_AA)
            draw_point(img, techo_izq, (0, 255, 255), " TB")
            draw_point(img, techo_der, (0, 255, 255), " TB")

        p_horizontal_izq = (techo_izq[0], c_y_izq[1]) 
        p_horizontal_der = (techo_der[0], c_y_der[1])
        
        angulo_izq = calculate_acetabular_angle(techo_izq, c_y_izq)
        angulo_der = calculate_acetabular_angle(techo_der, c_y_der)

        if "Cálculo de Angulación" in filtros:
            cv2.line(img, c_y_izq, techo_izq, (120, 255, 120), 4, cv2.LINE_AA)
            cv2.line(img, c_y_der, techo_der, (120, 255, 120), 4, cv2.LINE_AA)
            draw_angle_arc(img, c_y_izq, techo_izq, p_horizontal_izq, color=(0, 255, 0), radius=60, start_angle=180, end_angle=180+angulo_izq*1.2)
            draw_angle_arc(img, c_y_der, techo_der, p_horizontal_der, color=(0, 255, 0), radius=60, start_angle=360-angulo_der*1.2, end_angle=360)

        if "Resultado Médico Final" in filtros:
            st_izq = "NORMAL" if angulo_izq < 28 else ("LIMITROFE" if angulo_izq < 30 else "DISPLASIA")
            st_der = "NORMAL" if angulo_der < 28 else ("LIMITROFE" if angulo_der < 30 else "DISPLASIA")
            c_izq = (100, 255, 100) if st_izq == "NORMAL" else (100, 100, 255)
            c_der = (100, 255, 100) if st_der == "NORMAL" else (100, 100, 255)

            h = img.shape[0]
            # HUD pegado a la PARTE INFERIOR para no tapar las líneas médicas centrales
            y_offset = h - 140

            draw_beautiful_text(img, "CADERA DERECHA (RX)", (20, y_offset), 0.75, (255, 200, 50), (20, 20, 20))
            draw_beautiful_text(img, f"Alfa: {angulo_izq:.1f}  |  DX: {st_izq}", (20, y_offset + 45), 0.75, c_izq, (20, 20, 20))

            x_right = img.shape[1] - 410
            if x_right < 300: x_right = int(img.shape[1] / 2) + 20

            draw_beautiful_text(img, "CADERA IZQUIERDA (RX)", (x_right, y_offset), 0.75, (255, 200, 50), (20, 20, 20))
            draw_beautiful_text(img, f"Alfa: {angulo_der:.1f}  |  DX: {st_der}", (x_right, y_offset + 45), 0.75, c_der, (20, 20, 20))

        # Título del software siempre visible en la parte inferior al centro
        titulo = "DDC Pasitos Firmes - IA"
        (tw, th), _ = cv2.getTextSize(titulo, cv2.FONT_HERSHEY_DUPLEX, 0.8, 2)
        tx = int((img.shape[1] - tw) / 2)
        ty = img.shape[0] - 15
        draw_beautiful_text(img, titulo, (tx, ty), 0.8, (255, 255, 255), (60, 20, 20))

    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

with gr.Blocks(theme=gr.themes.Soft(primary_hue="emerald", neutral_hue="slate")) as app:
    gr.Markdown("# 🏥 Sistema Integral DDC Pasitos Firmes [VERSION DEFINITIVA]")
    
    with gr.Row():
        with gr.Column():
            imagen_entrada = gr.Image(type="numpy", label="RADIOGRAFÍA DEL PACIENTE")
            filtros = gr.CheckboxGroup(
                choices=["Líneas Clínicas Base (H&P)", "Cálculo de Angulación", "Resultado Médico Final"],
                value=["Líneas Clínicas Base (H&P)", "Cálculo de Angulación", "Resultado Médico Final"],
                label="SELECCION DE FUNCIONES DE IA"
            )
        with gr.Column():
            imagen_salida = gr.Image(type="numpy", label="Resultado", show_label=False)
            
    imagen_entrada.change(fn=analizar_radiografia, inputs=[imagen_entrada, filtros], outputs=imagen_salida)
    filtros.change(fn=analizar_radiografia, inputs=[imagen_entrada, filtros], outputs=imagen_salida)

    gr.Examples(
        examples=[["/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints/Test/111qy.jpg"]],
        inputs=imagen_entrada
    )

if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=7861)
