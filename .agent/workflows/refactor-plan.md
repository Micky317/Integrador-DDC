# 🛠️ Plan de Refactorización Senior — DDC Pasitos Firmes

Este manual describe el orden lógico para transformar el proyecto de un estado monolítico a una arquitectura profesional escalable.

## Fase 1: Backend Modular (Python)
1. **Crear estructura de carpetas** en `backend/src/`.
2. **Extraer Pydantic Models** a `schemas.py`.
3. **Extraer Lógica Médica** (ángulos y diagnósticos) a `core/logic.py`.
4. **Extraer Motor de IA** a `ai/model_loader.py`.
5. **Extraer Procesamiento de Imagen** a `utils/drawing.py`.
6. **Limpiar `main.py`** para que solo contenga los routers de FastAPI.

## Fase 2: Infrastructure Frontend (React Native)
1. **Instalar Dependencias**:
   - `npm install @tanstack/react-query zustand`
2. **Configurar Provider**: Envolver `_layout.tsx` con el `QueryClientProvider`.
3. **Crear Store de Zustand**: Para manejar el estado global del paciente y análisis.

## Fase 3: Feature Refactor (Pantalla de Análisis)
1. **Extraer `EditorPuntosModal`**: Mover a `src/features/analisis/components/`.
2. **Extraer `DraggablePoint`**: Mover a `src/features/analisis/components/`.
3. **Crear `useAnalisis` Hook**: Extraer toda la lógica de `useEffect`, `fetch` y estados locales de la pantalla.
4. **Simplificar `AnalisisScreen.tsx`**: Debe reducirse de 600 líneas a menos de 150.

## Reglas de Validación
- Después de cada movimiento de archivos, probar la conexión con el móvil.
- No borrar código antiguo hasta que el nuevo esté testeado.
- Mantener compatibilidad de nombres de variables para no romper la IA.
