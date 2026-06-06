import os
import time
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv

load_dotenv()

class AnalyticsService:
    def __init__(self):
        self.url = os.getenv("INFLUXDB_URL", "http://localhost:8086")
        self.token = os.getenv("INFLUXDB_TOKEN")
        self.org = os.getenv("INFLUXDB_ORG", "pasitos_firmes")
        self.bucket = os.getenv("INFLUXDB_BUCKET", "telemetry")
        
        if self.token:
            self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
            self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        else:
            print("⚠️ ADVERTENCIA: No se encontró INFLUXDB_TOKEN. El servicio de analítica está desactivado.")
            self.client = None

    def log_clinical_event(self, paciente_id: str, angulo_izq: float, angulo_der: float, tecnica_correcta: bool, dx_izq: str = "", dx_der: str = "", categoria_graf: str = "", medico_id: str = "", timestamp: str = None):
        """Registra la evolución de los ángulos acetabulares (ambos lados)."""
        if not self.client: return
        
        point = Point("evolucion_clinica") \
            .tag("paciente_id", paciente_id) \
            .tag("medico_id", medico_id or "unknown") \
            .field("angulo_izquierdo", float(angulo_izq)) \
            .field("angulo_derecho", float(angulo_der)) \
            .field("dx_izq", dx_izq) \
            .field("dx_der", dx_der) \
            .field("categoria_graf", categoria_graf) \
            .field("tecnica_correcta", int(tecnica_correcta))
        
        if timestamp:
            try:
                from datetime import datetime, timezone
                if len(timestamp) == 10 and '-' in timestamp:
                    dt = datetime.strptime(timestamp, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                else:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                point.time(dt, WritePrecision.NS)
            except Exception as e:
                print(f"⚠️ Error parsing timestamp '{timestamp}': {e}. Usando hora del sistema.")
                import time
                point.time(time.time_ns(), WritePrecision.NS)
        else:
            import time
            point.time(time.time_ns(), WritePrecision.NS)
        
        try:
            self.write_api.write(bucket=self.bucket, org=self.org, record=point)
            print(f"📊 Métrica clínica enviada: Paciente {paciente_id}, IZQ: {angulo_izq}°, DER: {angulo_der}°, Fecha: {timestamp or 'Ahora'}")
        except Exception as e:
            print(f"❌ Error enviando métrica clínica: {e}")

    def log_system_metrics(self, endpoint: str, latency_ms: float, status_code: int):
        """Registra métricas de rendimiento del servidor."""
        if not self.client: return
        
        point = Point("rendimiento_servidor") \
            .tag("endpoint", endpoint) \
            .field("latencia_ms", float(latency_ms)) \
            .field("status_code", int(status_code)) \
            .time(time.time_ns(), WritePrecision.NS)
        
        try:
            self.write_api.write(bucket=self.bucket, org=self.org, record=point)
        except Exception as e:
            print(f"❌ Error enviando métrica de sistema: {e}")

# Instancia global para ser usada en toda la aplicación
analytics = AnalyticsService()
