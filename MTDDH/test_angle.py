import math
from ultralytics import YOLO

model = YOLO('/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt')
results = model('/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints/Test/111qy.jpg', verbose=False)
puntos = results[0].keypoints.xy[0].cpu().numpy()

for i, p in enumerate(puntos):
    print(f"Index {i}: X={p[0]:.2f}, Y={p[1]:.2f}")

print("\nHeuristica X-Sort:")
pts = [p for p in puntos if not (p[0] == 0 and p[1] == 0)]
pts_x = sorted(pts, key=lambda p: p[0])

# Imprimir las dos mitades
left_half = pts_x[:4]
right_half = pts_x[4:]

print("Left Half (derecha médica):")
for p in left_half:
    print(f"X={p[0]:.2f}, Y={p[1]:.2f}")

print("Right Half (izquierda médica):")
for p in right_half:
    print(f"X={p[0]:.2f}, Y={p[1]:.2f}")

# Simular matematica de webapp v3
for (i, j) in [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3)]:
    dx = abs(puntos[i][0] - puntos[j][0]) + 0.0001
    dy = abs(puntos[i][1] - puntos[j][1])
    angulo = math.degrees(math.atan2(dy, dx))
    print(f"Angles Index {i} vs {j} => dx:{dx:.2f}, dy:{dy:.2f}, angulo: {angulo:.2f}")

# Cuales indices darian dx cerca a 0 (vertical alineados)?
