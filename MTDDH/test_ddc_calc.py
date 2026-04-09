import cv2
import math
from ultralytics import YOLO

# Ruta de la imagen de prueba y del modelo
img_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/Dataset1/Keypoints/Test/111qy.jpg'
modelo_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt'
output_path = '/home/angel/Documentos/Universidad/integrador/MTDDH/resultado_radiografia.jpg'

def main():
    print("Cargando modelo...")
    model = YOLO(modelo_path)
    
    # Hacer la inferencia
    print(f"Analizando la radiografía {img_path}...")
    results = model(img_path)
    
    # Cargar la imagen usando OpenCV para dibujar encima
    img = cv2.imread(img_path)
    if img is None:
        print("No se pudo cargar la imagen.")
        return

    # Extraer los resultados del primer (y único) frame/imagen
    # results[0].keypoints.xy contiene las coordenadas [X, Y]
    if hasattr(results[0], 'keypoints') and results[0].keypoints is not None:
        puntos = results[0].keypoints.xy[0].cpu().numpy() # Convertir a matriz numpy
        
        # Vamos a dibujar los 8 puntos detectados en la imagen
        print(f"Se encontraron {len(puntos)} puntos clave.")
        
        for i, (x, y) in enumerate(puntos):
            if x == 0 and y == 0: 
                continue # A veces el modelo devuelve 0,0 si no ve el punto
                
            x, y = int(x), int(y)
            # Dibujar un círculo rojo en el punto
            cv2.circle(img, (x, y), radius=6, color=(0, 0, 255), thickness=-1)
            # Ponerle el número al lado para saber cuál es cuál
            cv2.putText(img, str(i), (x + 10, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)

        # Aquí es donde pondremos la matemática matemática para trazar Hilgenreiner y Perkins
        # Por ejemplo (líneas de prueba conceptuales):
        # if len(puntos) == 8:
        #   punto_izq_Y = puntos[0] 
        #   punto_der_Y = puntos[1]
        #   cv2.line(img, (int(punto_izq_Y[0]), int(punto_izq_Y[1])), (int(punto_der_Y[0]), int(punto_der_Y[1])), (255, 0, 0), 2)
        
    else:
        print("No se detectaron puntos clave (Pose).")

    # Guardar la imagen con los trazos
    cv2.imwrite(output_path, img)
    print(f"¡Listo! La imagen procesada se guardó en: {output_path}")

if __name__ == "__main__":
    main()
