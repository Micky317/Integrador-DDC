---
description: Cómo levantar el servidor FastAPI de la IA (el backend del análisis de radiografías DDC)
---

## Requisitos previos
- Python 3.10+ con pip
- El modelo entrenado en: `MTDDH/runs/pose/ddh_pose_model/weights/best.pt`
- Credenciales de Supabase en `/backend/.env`

## Pasos para crear y levantar el backend FastAPI

// turbo
1. Crear el entorno virtual del backend:
```bash
cd /home/angel/Documentos/Universidad/integrador/backend
python -m venv venv
./venv/bin/pip install fastapi uvicorn python-multipart ultralytics opencv-python-headless Pillow python-dotenv
```

2. Crear el archivo principal `main.py` en `/backend/main.py`

3. Crear el archivo `.env` en `/backend/.env` con las variables de entorno

// turbo
4. Levantar el servidor:
```bash
cd /home/angel/Documentos/Universidad/integrador/backend
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

5. Probar el endpoint en: http://localhost:8000/docs
