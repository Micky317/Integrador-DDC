import math
from ultralytics import YOLO
import os

model = YOLO('/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt')
test_dir = '/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints/Test'
imagenes = sorted(os.listdir(test_dir))[:50]  # Solo las primeras 50 para ser rápidos

def calculate_acetabular_angle(p_techo, p_cartilago):
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001
    return math.degrees(math.atan2(dy, dx))

print("Escaneando radiografías en busca de DISPLASIA (angulo > 30°)...\n")
casos_displasia = []

for img_name in imagenes:
    if not img_name.endswith('.jpg'): continue
    img_path = os.path.join(test_dir, img_name)
    try:
        results = model(img_path, verbose=False)
        if results[0].keypoints is None: continue
        puntos = results[0].keypoints.xy[0].cpu().numpy()
        if len(puntos) < 6: continue
        
        techo_izq = (puntos[0][0], puntos[0][1])
        c_y_izq   = (puntos[1][0], puntos[1][1])
        techo_der = (puntos[4][0], puntos[4][1])
        c_y_der   = (puntos[5][0], puntos[5][1])
        
        if techo_izq[0] == 0 or techo_der[0] == 0: continue
        
        ang_izq = calculate_acetabular_angle(techo_izq, c_y_izq)
        ang_der = calculate_acetabular_angle(techo_der, c_y_der)
        
        estado_izq = "DISPLASIA" if ang_izq > 30 else ("LIMITROFE" if ang_izq > 28 else "NORMAL")
        estado_der = "DISPLASIA" if ang_der > 30 else ("LIMITROFE" if ang_der > 28 else "NORMAL")
        
        if "DISPLASIA" in [estado_izq, estado_der] or "LIMITROFE" in [estado_izq, estado_der]:
            casos_displasia.append((img_name, ang_izq, estado_izq, ang_der, estado_der))
            print(f"  [{img_name}] -> Der: {ang_izq:.1f}° ({estado_izq}) | Izq: {ang_der:.1f}° ({estado_der})")
    except Exception as e:
        pass

print(f"\nTotal encontrados: {len(casos_displasia)} radiografías con displasia o limítrofe en las primeras 50 imágenes.")
