import os
import time
import random
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv

load_dotenv()

def seed_data():
    url = os.getenv("INFLUXDB_URL", "http://localhost:8086")
    token = os.getenv("INFLUXDB_TOKEN")
    org = os.getenv("INFLUXDB_ORG", "pasitos_firmes")
    bucket = os.getenv("INFLUXDB_BUCKET", "telemetry")

    if not token:
        print("❌ Error: No hay token en el .env")
        return

    client = InfluxDBClient(url=url, token=token, org=org)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    print("🌱 Sembrando datos clínicos de AMBAS PIERNAS...")

    paciente_id = "paciente_tesis_001"
    # Ambos empiezan mal y van mejorando
    ang_izq_init = 35.0
    ang_der_init = 38.0
    
    now = time.time_ns()

    for i in range(30):
        # Progreso diario
        progreso = (i / 30) * 15.0
        ang_izq = ang_izq_init - progreso + random.uniform(-1, 1)
        ang_der = ang_der_init - progreso + random.uniform(-1, 1)
        
        timestamp = now - (30 - i) * 24 * 3600 * 1000000000

        point = Point("evolucion_clinica") \
            .tag("paciente_id", paciente_id) \
            .field("angulo_izquierdo", float(ang_izq)) \
            .field("angulo_derecho", float(ang_der)) \
            .field("tecnica_correcta", int(ang_izq < 30 and ang_der < 30)) \
            .time(timestamp, WritePrecision.NS)
        
        write_api.write(bucket=bucket, org=org, record=point)
        
        # Métrica de sistema
        sys_point = Point("rendimiento_servidor") \
            .tag("endpoint", "/video-analysis") \
            .field("latencia_ms", random.uniform(150, 450)) \
            .field("status_code", 200) \
            .time(timestamp, WritePrecision.NS)
            
        write_api.write(bucket=bucket, org=org, record=sys_point)

    print(f"✅ ¡Éxito! Dashboard listo con datos de Pierna Izquierda y Derecha.")

if __name__ == "__main__":
    seed_data()
