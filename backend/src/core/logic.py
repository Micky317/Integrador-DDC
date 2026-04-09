import math

def calculate_acetabular_angle(p_techo: tuple, p_cartilago: tuple) -> float:
    """Calcula el ángulo acetabular (Índice Alfa) entre el techo y el cartílago trirradiado."""
    dy = abs(p_cartilago[1] - p_techo[1])
    dx = abs(p_cartilago[0] - p_techo[0]) + 0.0001  # Evita división por cero
    return math.degrees(math.atan2(dy, dx))

def get_diagnostico(angulo: float) -> str:
    """Retorna el diagnóstico clínico según los umbrales médicos estándar."""
    if angulo < 28.0:
        return "NORMAL"
    elif angulo < 30.0:
        return "LIMITROFE"
    else:
        return "DISPLASIA"
