import pandas as pd
import numpy as np
import os

def generate_ddc_dataset(n_samples=500):
    np.random.seed(42)
    
    # 1. Generar Edades (0 a 24 meses)
    # Usamos una distribución más cargada hacia los primeros meses que es cuando se detecta
    ages = np.random.exponential(scale=8, size=n_samples)
    ages = np.clip(ages, 0, 24)
    
    # 2. Generar Ángulos Acetabulares (Basado en la curva de osificación normal)
    # Fórmula base: Ángulo = 32 - (0.5 * Edad) + Ruido
    # Un recién nacido (~32°), un niño de 24 meses (~20°)
    base_angles = 32 - (0.5 * ages)
    
    # Añadir ruido blanco (variación natural de +- 3 grados)
    noise = np.random.normal(0, 1.5, size=n_samples)
    angles = base_angles + noise
    
    # 3. Añadir Outliers (Casos con Displasia Severa)
    # Alrededor del 5% de los datos serán casos que no mejoran o tienen ángulos muy altos
    n_outliers = int(n_samples * 0.05)
    outlier_indices = np.random.choice(n_samples, n_outliers, replace=False)
    
    for idx in outlier_indices:
        # A estos pacientes les ponemos ángulos altos (35-45 grados) sin importar la edad
        angles[idx] = np.random.uniform(36, 45)
    
    # 4. Crear DataFrame
    df = pd.DataFrame({
        'paciente_id': range(1, n_samples + 1),
        'edad_meses': np.round(ages, 1),
        'angulo_acetabular': np.round(angles, 1),
        'es_outlier': [1 if i in outlier_indices else 0 for i in range(n_samples)]
    })
    
    # Guardar en CSV
    output_path = os.path.join(os.path.dirname(__file__), 'dataset_ddc.csv')
    df.to_csv(output_path, index=False)
    print(f"✅ Dataset generado con {n_samples} muestras en: {output_path}")

if __name__ == "__main__":
    generate_ddc_dataset()
