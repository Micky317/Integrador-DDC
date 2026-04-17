# 🌿 Guía de Flujo de Trabajo Git - Proyecto DDC

Este archivo define las reglas de oro para mantener nuestro código seguro y organizado. **LEER SIEMPRE ANTES DE REALIZAR UN COMMIT.**

## 1. Estándar de Mensajes de Commit (Conventional Commits)
Usaremos prefijos para identificar rápidamente el tipo de cambio:

*   `feat:` Nueva funcionalidad (ej: `feat: temporizador de ejercicios`).
*   `fix:` Corrección de un error (ej: `fix: calculo de angulos`).
*   `docs:` Cambios en documentación (ej: `docs: actualizar readme`).
*   `style:` Cambios visuales/estéticos sin lógica (ej: `style: color de botones`).
*   `refactor:` Mejora de código sin cambiar funcionalidad.
*   `chore:` Tareas de mantenimiento (ej: `chore: actualizar .env`).

## 2. Gestión de Ramas (Branches)
*   `master`: El código estable que se muestra al docente. Solo commits validados.
*   `feature/nombre-tarea`: Para desarrollar nuevas partes de la app (ej: `feature/rehabilitacion`).
*   `fix/nombre-bug`: Para arreglar algo específico que se rompió.

## 3. Flujo de Trabajo Diario
1.  **Sincronizar:** `git status` para ver qué cambió.
2.  **Guardar:** `git add .` para preparar los archivos.
3.  **Confirmar:** `git commit -m "prefijo: mensaje descriptivo"`.
4.  **Si es arriesgado:** Crear una rama temporal antes de tocar código crítico.

## 4. Auditoría de Seguridad
*   **Archivos Prohibidos:** ¡NUNCA subir claves privadas! Confirmar que `.env` esté siempre en `.gitignore`.
*   **Puntos de Restauración:** Pedir un commit antes de cada sesión de programación intensiva.

---
*Manual de Git - Generado por Antigravity*
