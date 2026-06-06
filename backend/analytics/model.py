import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import json
import os
import matplotlib.pyplot as plt

def train_polynomial_model():
    # 1. Cargar datos
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, 'dataset_ddc.csv')
    df = pd.read_csv(csv_path)
    
    # 2. Filtrar para el modelo "Normal"
    df_normal = df[df['es_outlier'] == 0]
    X = df_normal[['edad_meses']].values
    y = df_normal['angulo_acetabular'].values
    
    # 3. Transformar a características polinomiales (Grado 2)
    poly = PolynomialFeatures(degree=2)
    X_poly = poly.fit_transform(X)
    
    # 4. Entrenar Regresión
    model = LinearRegression()
    model.fit(X_poly, y)
    
    # Parámetros (y = ax^2 + bx + c)
    # X_poly columns: [1, x, x^2]
    c = model.intercept_
    b = model.coef_[1]
    a = model.coef_[2]
    
    y_pred = model.predict(X_poly)
    r2 = model.score(X_poly, y)
    
    # 5. Guardar resultados
    results = {
        "a": round(float(a), 6),
        "b": round(float(b), 6),
        "c": round(float(c), 6),
        "r_squared": round(float(r2), 4),
        "description": "Modelo de osificación normal polinomial grado 2 (Dataset MTDDH)",
        "unit_age": "meses",
        "unit_angle": "grados"
    }
    
    json_path = os.path.join(base_dir, 'baseline.json')
    with open(json_path, 'w') as f:
        json.dump(results, f, indent=4)
    
    print(f"📊 Modelo Polinomial entrenado con éxito.")
    print(f"   Ecuación: y = {results['a']}x² + {results['b']}x + {results['c']}")
    print(f"   Precisión (R²): {results['r_squared']}")
    
    # 6. Gráfica de validación
    plt.figure(figsize=(10, 6))
    plt.scatter(df_normal['edad_meses'], df_normal['angulo_acetabular'], alpha=0.3, label='Casos Normales', color='blue')
    
    # Generar curva suave para la gráfica
    x_range = np.linspace(0, 24, 100).reshape(-1, 1)
    x_range_poly = poly.transform(x_range)
    y_range_pred = model.predict(x_range_poly)
    
    plt.plot(x_range, y_range_pred, color='green', linewidth=3, label='Curva de Osificación IA (Polinomial)')
    
    plt.title('Modelo Polinomial: Evolución del Ángulo Acetabular')
    plt.xlabel('Edad (Meses)')
    plt.ylabel('Ángulo (Grados)')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.5)
    
    plot_path = os.path.join(base_dir, 'validacion_modelo_poli.png')
    plt.savefig(plot_path)
    print(f"📈 Gráfica guardada en: {plot_path}")

if __name__ == "__main__":
    train_polynomial_model()
