# ⚙️ Información del Entorno Virtual (Proyecto Graduación)

Este proyecto ha sido optimizado para ahorrar espacio en disco (Aproximadamente 8GB recuperados).

## 🛠️ Estructura del Entorno Unificado
Para evitar la duplicación de librerías pesadas como **PyTorch** y **CUDA**, se ha unificado el entorno virtual del proyecto:

*   **Entorno Maestro:** `MTDDH/venv`
*   **Enlace Simbólico:** `backend/venv` (Apunta al maestro)

## ⚠️ Instrucciones para el Agente / Desarrollador
Si necesitas instalar una nueva librería en el **backend**, ten en cuenta que se instalará en el entorno compartido. No es necesario crear un nuevo entorno para el backend. Ambos proyectos comparten ahora las mismas dependencias de IA.

---
*Optimizado por Antigravity - 15 de Abril, 2026*
