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

| Capa | Tecnología | Razón |
|---|---|---|
| Modelo de IA | YOLOv8n-pose (Ultralytics) | Entrenado. 99.1% mAP50-95, 8 keypoints DDH |
| API de IA | **FastAPI** (Python) | Recibe imagen JPG → devuelve JSON con ángulos y diagnóstico |
| Base de datos | **Supabase** (PostgreSQL) | Auth, Storage de radiografías, historial clínico, RLS |
| App Móvil | **Expo** (React Native + TypeScript) | Universal: iOS, Android y Web desde un solo codebase |
| Estado Global | **Zustand** | Manejo de estado ultra-ligero y rápido |
| Data Fetching | **TanStack Query (v5)** | Caché inteligente, reintentos automáticos y performance |
| Lenguaje | **TypeScript** | Tipado estricto crítico para aplicaciones de salud |

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

## Estándares de Arquitectura (SENIOR REFAC)

### 🐍 Backend (Modular Domain Logic)
Para escalabilidad, el backend se organiza en módulos:
- `api/`: Definición de rutas (FastAPI). No contiene lógica de IA.
- `core/`: Lógica de negocio (Cálculos de ángulos de Graf, diagnósticos).
- `ai/`: Gestión del modelo YOLO (Carga e inferencia).
- `utils/`: Procesamiento de imágenes con OpenCV.
- `schemas/`: Modelos Pydantic para peticiones/respuestas.

### ⚛️ Frontend (Feature-Based Architecture)
Para evitar archivos gigantes y facilitar el mantenimiento:
- `app/`: Routing puro (Expo Router).
- `src/features/[feature_name]/`: Lógica pesada, sub-componentes y hooks específicos.
- `src/components/`: UI Atómica (Botones, Inputs, Cards genéricos).
- `src/hooks/`: Hooks globales y de datos (TanStack Query).
- `src/services/`: Clientes de API y Supabase.
- `src/store/`: Estado global con Zustand.

---

## 🎩 Protocolo de Desarrollo SENIOR

Como desarrollador experto en este proyecto, mis reglas de oro son:

1.  **Preguntar antes de Actuar:** Si una instrucción es ambigua o falta contexto técnico/médico, debo **detenerme y preguntar** antes de generar código.
2.  **Manejo de Errores Robusto:** Todo código nuevo o refactorizado **debe** incluir bloques de control de errores (try/catch) y feedback claro para el usuario.
3.  **Bitácora Siempre Viva (.agent/):** Es OBLIGATORIO actualizar los archivos de la carpeta `.agent/` (workflows y planes) inmediatamente después de completar una fase o tarea importante.
4.  **Código Limpio (DRY & Legible):** Prohibida la lógica duplicada. Usar nombres de variables descriptivos en inglés o español técnico.
5.  **Comentarios Profesionales:** Los comentarios en el código fuente deben ser sobrios y **SIN EMOJIS**. Los emojis se permiten únicamente en archivos de la carpeta `.agent/`. Eliminar comentarios obvios o decorativos.
6.  **Explicación de Cambios:** Cada refactorización o cambio importante debe venir acompañado de una explicación de la decisión técnica tomada.
7.  **Un solo Agente Maestro:** En este punto del proyecto, el Agente actual posee todo el contexto refactorizado. No es necesario recurrir a guías de Agente 2 o 3 para lógica de Supabase o UI básica.

---

## 📊 Diccionario de Datos y Tipos (Interfaces)

Para mantener la consistencia, estas son las estructuras base:

### `Paciente`
```typescript
interface Paciente {
  id: string;          // UUID de Supabase
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  genero: 'M' | 'F';
  tutor_id: string;    // Relación con tabla perfiles
  created_at: string;
}
```

### `Analisis`
```typescript
interface Analisis {
  id: string;
  paciente_id: string;
  angulo_izq: number;
  angulo_der: number;
  dx_izq: 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';
  dx_der: 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';
  imagen_url: string;  // Path en Supabase Storage
  puntos_clave: KeyPoint[]; 
  fecha: string;
}
```

---

## 🎨 Sistema de Diseño y UI

Mantener siempre estos tokens visuales:
- **Color Primario:** `#00E5CC` (Cyan Médico)
- **Fondo:** `#090D1F` (Dark Deep Blue)
- **Status Colors:** Verde (`#00C48C`), Amarillo (`#FFB400`), Rojo (`#FF4757`).
- **Layout:** Los componentes de pantalla no deben exceder las **200 líneas**. Extraer lógica a Hooks y UI a sub-componentes.

---

---

## 🛠️ Protocolo de Manejo de Errores

1.  **Error de IA:** Si `POST /analyze` falla, mostrar un Alert informando que es un "Error de conexión con el Servidor Médico" y permitir que el usuario intente de nuevo o use el ajuste manual.
2.  **Error de Red:** Usar los reintentos automáticos de **TanStack Query**.
3.  **Feedback Visual:** Nunca dejar la pantalla vacía; usar Skeletons o ActivityIndicators de la marca.

---

## 📡 Contrato de API (Endpoints Actuales)

| Endpoint | Método | Cuerpo (FormData) | Respuesta (JSON) |
|---|---|---|---|
| `/analyze` | `POST` | `file`: Imagen RX | `AnalisisApiResponse` |
| `/recalculate` | `POST` | `file`: Imagen RX, `puntos_json`: string | `AnalisisApiResponse` |

**`AnalisisApiResponse` Structure:**
```json
{
  "angulo_izquierda": 0.0,
  "angulo_derecha": 0.0,
  "diagnostico_izquierda": "NORMAL|LIMITROFE|DISPLASIA",
  "diagnostico_derecha": "NORMAL|LIMITROFE|DISPLASIA",
  "imagen_anotada_base64": "string...",
  "puntos_clave": [{"id": 0, "label": "string", "x": 0, "y": 0}]
}
```

---

## 💾 Esquema de Base de Datos (Supabase)

### Tabla `pacientes`
- `id`: UUID (Primary Key)
- `nombre_completo`: Text
- `codigo_paciente`: Text (ej: P-1234)
- `fecha_nacimiento`: Date
- `sexo`: 'M' | 'F'
- `doctor_id`: UUID (FK perfiles)

### Tabla `analisis`
- `id`: UUID (Primary Key)
- `paciente_id`: UUID (FK pacientes)
- `angulo_izq`: Float
- `angulo_der`: Float
- `puntos_json`: JSONB (Coordenadas de los 8 puntos)
- `imagen_url`: Text (Storage path)
- `created_at`: Timestamp

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

- [x] Dataset preparado (COCO Keypoints → YOLO format)
- [x] Modelo YOLOv8n-pose entrenado (100 epochs, 99.1% mAP50-95)
- [x] Demo Gradio funcional con filtros de trazado médico
- [x] FastAPI backend (Monolito inicial) ✅
- [x] Supabase: tablas y roles ✅
- [x] Ajuste manual de puntos con Zoom y Precisión ✅
- [x] Refactorización a Arquitectura Modular (Backend) ✅
- [x] Refactorización a Arquitectura de Features (Frontend) ✅
- [x] Implementación de TanStack Query y Zustand ✅
- [x] Conexión a Supabase (Auth, Pacientes y Storage) ✅
