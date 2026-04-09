import os
from pathlib import Path
from ultralytics import YOLO

def load_yolo_model():
    """Carga el modelo YOLOv8 una sola vez al iniciar la aplicación."""
    # Obtenemos la ruta asumiendo que este archivo está en:
    # backend/src/ai/model_loader.py -> parent 1: ai, parent 2: src, parent 3: backend, parent 4: integrador
    project_root = Path(__file__).parent.parent.parent.parent
    default_model_path = project_root / "MTDDH/runs/pose/ddh_pose_model/weights/best.pt"
    
    MODEL_PATH = os.getenv("MODEL_PATH", str(default_model_path))

    print(f"Cargando modelo desde: {MODEL_PATH}")
    try:
        model = YOLO(MODEL_PATH)
        print("✅ Modelo YOLOv8 Pose cargado exitosamente.")
        return model
    except Exception as e:
        print(f"❌ Error al cargar modelo: {e}")
        return None

# Instancia global del modelo para todo el backend
model_instance = load_yolo_model()
