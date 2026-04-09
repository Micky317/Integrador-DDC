---
name: DDC Pasitos Firmes - Contexto Completo del Proyecto
description: Skill principal para cualquier agente que trabaje en el proyecto de tesis "DDC Pasitos Firmes". Contiene arquitectura, stack tecnológico, decisiones de diseño y convenciones de código.
---

# DDC Pasitos Firmes — Master Skill

## Qué es este proyecto

Proyecto de grado de Ingeniería en Sistemas de la Universidad Franz Tamayo (Cochabamba, Bolivia).
**Autor:** Miguel Ángel Fernandez Mita
**Tutor:** Ing. Cristhian Luis López Bravo

Sistema integral de diagnóstico, seguimiento y rehabilitación para la **Displasia del Desarrollo de la Cadera (DDC)**. Combina Inteligencia Artificial (YOLOv8 Pose) con una plataforma digital para médicos y padres de familia.

---

## Estructura del Repositorio

```
/home/angel/Documentos/Universidad/integrador/
├── MTDDH/                          ← Modelo de IA (NO TOCAR sin permiso)
│   ├── runs/pose/ddh_pose_model/
│   │   └── weights/
│   │       └── best.pt             ← ⭐ Modelo entrenado definitivo (YOLOv8n-pose)
│   ├── yolo_dataset/               ← Dataset preparado para YOLO
│   │   └── dataset.yaml
│   ├── Dataset1/Keypoints/Test/    ← Radiografías de prueba
│   ├── webapp.py                   ← Demo Gradio funcional (puerto 7861)
│   ├── train.py                    ← Script de entrenamiento (YA EJECUTADO)
│   └── venv/                       ← Python virtualenv con ultralytics, CV2
│
├── backend/                        ← FastAPI: API REST de la IA
│   └── ...
│
├── app/                            ← Expo (React Native + Web) App móvil
│   └── ...
│
└── .agent/
    ├── skills/SKILL.md             ← Este archivo
    └── workflows/                  ← Instrucciones paso a paso por módulo
```

---

## Stack Tecnológico DEFINITIVO

| Capa | Tecnología | Razón |
|---|---|---|
| Modelo de IA | YOLOv8n-pose (Ultralytics) | Entrenado. 99.1% mAP50-95, 8 keypoints DDH |
| API de IA | **FastAPI** (Python) | Recibe imagen JPG → devuelve JSON con ángulos y diagnóstico |
| Base de datos | **Supabase** (PostgreSQL) | Auth, Storage de radiografías, historial clínico, RLS |
| App Móvil | **Expo** (React Native + TypeScript) | Universal: iOS, Android y Web desde un solo codebase |
| Lenguaje frontend | **TypeScript** (nunca JavaScript puro) | Tipado estricto crítico para aplicaciones de salud |

---

## Arquitectura del Sistema (Flujo de Datos)

```
[App Celular/Web (Expo)]
        ↓ POST /analyze (imagen JPEG multipart)
[FastAPI Backend]
        ↓ Inferencia YOLO → calcula ángulos
        ↓ Devuelve JSON { angulo_izq, angulo_der, dx_izq, dx_der, imagen_anotada_base64 }
[App guarda resultado en Supabase]
        ↓ INSERT INTO analisis (paciente_id, angulo_izq, angulo_der, imagen_url)
[Supabase Storage] ← almacena la imagen anotada como PNG
[App muestra resultado en pantalla y PDF]
```

---

## El Modelo de IA — Detalles Críticos

- **Archivo:** `MTDDH/runs/pose/ddh_pose_model/weights/best.pt`  
- **Arquitectura:** YOLOv8n-pose  
- **Número de keypoints:** 8 (4 por cadera)  
- **Clase:** `cadera_pelvis` (class_id=0)
- **Rendimiento:** mAP50-95 Pose = 99.1% en validación

### Índices de Keypoints (¡CRÍTICO!)
El modelo fue entrenado con este orden de puntos:

| Índice | Anatomía | Cadera |
|---|---|---|
| 0 | Techo Acetabular (borde lateral superior) | Derecha del paciente (izquierda de la foto RX) |
| 1 | Cartílago Trirradiado (Y) | Derecha del paciente |
| 2 | Punto adicional inferior | Derecha del paciente |
| 3 | Punto adicional externo | Derecha del paciente |
| 4 | Techo Acetabular | Izquierda del paciente (derecha de la foto RX) |
| 5 | Cartílago Trirradiado (Y) | Izquierda del paciente |
| 6 | Punto adicional inferior | Izquierda del paciente |
| 7 | Punto adicional externo | Izquierda del paciente |

### Cálculo del Ángulo Acetabular (Índice Alfa)
```python
def calculate_acetabular_angle(p_techo, p_cartilago):
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001  # evita div/0
    return math.degrees(math.atan2(dy, dx))
```

### Clasificación Diagnóstica
| Ángulo Alfa | Diagnóstico |
|---|---|
| < 28° | NORMAL ✅ |
| 28° - 30° | LIMÍTROFE ⚠️ |
| > 30° | DISPLASIA 🔴 |

---

## Roles de Usuario

| Rol | Acceso | Funciones principales |
|---|---|---|
| **Administrador** | Web | Gestión de usuarios, validación de matrícula médica, estadísticas |
| **Médico** | Web + Móvil | Cargar RX, ver análisis IA, gestionar pacientes, generar PDF |
| **Padre/Tutor** | Móvil | Ver progreso del bebé, guías de ejercicios, recordatorios |

---

## Convenciones de Código

### Backend (FastAPI / Python)
- Usar `snake_case` para variables y funciones
- Todos los endpoints deben retornar `{"status": "ok"|"error", "data": {...}}`  
- El endpoint principal de análisis es `POST /analyze`
- Cargar el modelo YOLO una sola vez al iniciar el servidor (no en cada request)

### Frontend (Expo / TypeScript)
- Usar `camelCase` para variables, `PascalCase` para componentes
- Nunca usar `any` como tipo en TypeScript
- Carpeta `src/` con estructura: `screens/`, `components/`, `services/`, `types/`
- El cliente de Supabase se inicializa en `src/lib/supabase.ts`

---

## Variables de Entorno necesarias

### Backend (.env en /backend)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxx
MODEL_PATH=/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt
```

### App Expo (.env en /app)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxx
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

---

## Estado Actual del Proyecto (Actualizar con cada sesión)

- [x] Dataset preparado (COCO Keypoints → YOLO format)
- [x] Modelo YOLOv8n-pose entrenado (100 epochs, 99.1% mAP50-95)
- [x] Demo Gradio funcional con filtros de trazado médico
- [x] FastAPI backend ✅
- [x] Supabase: tablas y roles ✅
- [ ] App Expo: pantallas de login, médico, padre
