from ultralytics import YOLO
import os

def main():
    # Cargar el modelo YOLO pose base
    # yolov8n-pose.pt es el modelo nano, óptimo para velocidad y RTX 4050 (6GB)
    model = YOLO("yolov8n-pose.pt")
    
    # Configuración de hiperparámetros optimizada para AMD Ryzen 9 7940HS / NVIDIA RTX 4050
    results = model.train(
        data="yolo_dataset/dataset.yaml", # Archivo generado donde se definen las rutas
        epochs=100,                       # Número de iteraciones (puedes ajustar según necesites)
        imgsz=640,                        # Tamaño de imagen recomendado (640x640)
        device=0,                         # Usa la GPU Dedicada NVIDIA (device 0)
        batch=16,                         # Tamaño de lote óptimo para 6GB de VRAM
        workers=8,                        # CPU workers optimizados para Ryzen 9 de 8 núcleos
        name="ddh_pose_model",            # Nombre de la carpeta de salida (en runs/pose/)
        pretrained=True,                  # Empieza usando los pesos pre-entrenados
        save_period=10                    # Guarda un checkpoint cada 10 epochs por seguridad
    )
    
    print("¡El entrenamiento ha finalizado!")

if __name__ == '__main__':
    main()
