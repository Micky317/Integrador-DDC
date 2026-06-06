from pydantic import BaseModel

class KeyPoint(BaseModel):
    id: int
    label: str
    x: float
    y: float

class AnalysisResult(BaseModel):
    angulo_izquierda: float
    angulo_derecha: float
    diagnostico_izquierda: str   # NORMAL | LIMITROFE | DISPLASIA
    diagnostico_derecha: str
    imagen_anotada_base64: str   # La imagen con líneas dibujadas en base64
    puntos_clave: list[KeyPoint]

class HealthCheck(BaseModel):
    status: str
    modelo_cargado: bool
    version: str

class VideoAnalysisResult(BaseModel):
    tecnica_correcta: bool
    confianza: float
    feedback: str # Ej: "Abre más las piernas", "Mantén 5 segundos"
    frames_procesados: int
