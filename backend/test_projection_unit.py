import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Agregar src al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services.projection import (
    get_standard_angle,
    get_age_calcification_factor,
    calculate_age_months,
    get_effective_treatment_rate
)

class TestProjectionMath(unittest.TestCase):

    def test_standard_angle(self):
        # En el mes 0 (nacimiento), el ángulo acetabular esperado es cercano a 31.76
        angle_0 = get_standard_angle(0.0)
        self.assertAlmostEqual(angle_0, 31.762887, places=4)
        
        # Con la edad el ángulo decrece (maduración ósea)
        angle_12 = get_standard_angle(12.0)
        self.assertTrue(angle_12 < angle_0)
        
        # Ángulo en mes 24
        angle_24 = get_standard_angle(24.0)
        self.assertTrue(angle_24 < angle_12)

    def test_age_calcification_factor(self):
        # Plasticidad ósea según edad del bebé
        self.assertEqual(get_age_calcification_factor(2.0), 1.0)   # <= 4m
        self.assertEqual(get_age_calcification_factor(6.0), 0.8)   # <= 8m
        self.assertEqual(get_age_calcification_factor(10.0), 0.6)  # <= 12m
        self.assertEqual(get_age_calcification_factor(15.0), 0.4)  # <= 18m
        self.assertEqual(get_age_calcification_factor(20.0), 0.2)  # > 18m

    def test_calculate_age_months(self):
        self.assertEqual(calculate_age_months("2026-01-01", "2026-01-01"), 0.0)
        
        # 30.44 días de diferencia aprox = 1 mes
        self.assertAlmostEqual(calculate_age_months("2026-01-01", "2026-02-01"), 1.018, places=2)
        
        # Fecha inválida no rompe y devuelve 0.0
        self.assertEqual(calculate_age_months(None, "2026-01-01"), 0.0)
        self.assertEqual(calculate_age_months("2026-01-01", "fecha-invalida"), 0.0)

    def test_effective_treatment_rate_blend(self):
        # Prior clínico por defecto para arnés
        prior_arnes = -1.2
        # Prior clínico por defecto para ejercicios
        prior_ejercicios = -0.35
        
        # Caso sin datos poblacionales históricos
        pop_rates_empty = {}
        
        # Cuando no hay datos, se mezcla con prior clínico teóricamente.
        # Con K=3, si count=0, blended_rate = prior
        rate, ex_portion = get_effective_treatment_rate(["arnes", "ejercicios"], pop_rates_empty)
        self.assertAlmostEqual(rate, prior_arnes + prior_ejercicios, places=2)
        self.assertAlmostEqual(ex_portion, prior_ejercicios, places=2)
        
        # Caso con datos poblacionales históricos reales (ej: promedio observado es -3.5 grados/mes)
        # trats_key = tuple(sorted(treatments))
        pop_rates = {
            ("arnes", "ejercicios"): (-3.5, 1) # 1 caso histórico con promedio -3.5
        }
        
        rate_with_pop, _ = get_effective_treatment_rate(["arnes", "ejercicios"], pop_rates)
        # prior = -1.55, observed = -3.5, count = 1, K = 3
        # blended = (1 * -3.5 + 3 * -1.55) / 4 = (-3.5 - 4.65) / 4 = -8.15 / 4 = -2.0375
        self.assertAlmostEqual(rate_with_pop, -2.0375, places=4)
        
        # Si la población aumenta (ej: 100 casos históricos), el promedio observado pesa mucho más
        pop_rates_large = {
            ("arnes", "ejercicios"): (-3.5, 100)
        }
        rate_large_pop, _ = get_effective_treatment_rate(["arnes", "ejercicios"], pop_rates_large)
        # blended = (100 * -3.5 + 3 * -1.55) / 103 = (-350 - 4.65) / 103 = -3.443
        self.assertAlmostEqual(rate_large_pop, -3.443, places=2)

if __name__ == "__main__":
    unittest.main()
