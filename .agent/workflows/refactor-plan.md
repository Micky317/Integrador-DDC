# 🛠️ Plan de Refactorización Senior — DDC Pasitos Firmes

Este manual describe el orden lógico para transformar el proyecto de un estado monolítico a una arquitectura profesional escalable.

## Fase 1: Backend Modular (Python)
1. **Crear estructura de carpetas** en `backend/src/`.
### Fase 1: Modularización del Backend ✅
- [x] Crear estructura `backend/src/`.
- [x] Extraer lógica de IA a `src/ai/`.
- [x] Extraer lógica médica a `src/core/`.
- [x] Limpiar `main.py` y añadir manejo de errores.

### Fase 2: Infraestructura Frontend ✅
- [x] Instalar TanStack Query y Zustand.
- [x] Configurar QueryClient en `_layout.tsx`.
- [x] Crear Store global de paciente en `src/store/`.

### Fase 3: Refactor de Pantallas (Features) ✅
- [x] Extraer hooks personalizados para API (`useAnalisis`, etc.).
- [x] Descomponer `AnalisisScreen.tsx` en componentes pequeños.
- [x] Implementar arquitectura de "Features" en la carpeta `src/features/`.
- [x] Limpiar lógica duplicada y delegar a `utils/helpers.ts`.

## Reglas de Validación
- Después de cada movimiento de archivos, probar la conexión con el móvil.
- No borrar código antiguo hasta que el nuevo esté testeado.
- Mantener compatibilidad de nombres de variables para no romper la IA.
