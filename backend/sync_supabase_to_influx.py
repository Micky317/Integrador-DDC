import os
from dotenv import load_dotenv
from supabase import create_client, Client
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime

load_dotenv()

# Configuración Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Configuración InfluxDB
influx_url = os.environ.get("INFLUXDB_URL", "http://localhost:8086")
token = os.environ.get("INFLUXDB_TOKEN")
org = os.environ.get("INFLUXDB_ORG", "pasitos_firmes")
bucket = os.environ.get("INFLUXDB_BUCKET", "telemetry")

client = InfluxDBClient(url=influx_url, token=token, org=org)
write_api = client.write_api(write_options=SYNCHRONOUS)

def sync_data():
    print("🚀 Iniciando sincronización de datos: Supabase -> InfluxDB")
    
    # 1. Limpiar la medición 'evolucion_clinica' antes de escribir para evitar datos huérfanos o desfasados
    print("🗑️ Limpiando la medición 'evolucion_clinica' en InfluxDB...")
    try:
        delete_api = client.delete_api()
        delete_api.delete(
            start="1970-01-01T00:00:00Z",
            stop="2030-01-01T00:00:00Z",
            predicate='_measurement="evolucion_clinica"',
            bucket=bucket,
            org=org
        )
        print("✅ Medición 'evolucion_clinica' limpiada exitosamente.")
    except Exception as e:
        print(f"⚠️ Alerta al limpiar InfluxDB (continuando...): {e}")

    # 2. Obtener datos de Supabase
    response = supabase.table('analisis').select('*').execute()
    records = response.data
    
    if not records:
        print("⚠️ No se encontraron registros en Supabase.")
        return

    print(f"📦 Encontrados {len(records)} registros para sincronizar.")

    # 3. Enviar a InfluxDB
    count = 0
    for rec in records:
        try:
            from datetime import timezone
            # Parsear fecha (priorizar la fecha real de la radiografía sobre la de creación)
            fecha_str = rec.get('fecha_radiografia') or rec['created_at']
            if len(fecha_str) == 10 and '-' in fecha_str:
                dt = datetime.strptime(fecha_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            else:
                dt = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
            
            point = Point("evolucion_clinica") \
                .tag("paciente_id", rec['paciente_id']) \
                .tag("medico_id", rec.get('medico_id') or "unknown") \
                .field("angulo_izquierdo", float(rec['angulo_izq'])) \
                .field("angulo_derecho", float(rec['angulo_der'])) \
                .field("dx_izq", rec['dx_izq']) \
                .field("dx_der", rec['dx_der']) \
                .field("categoria_graf", rec['categoria_graf']) \
                .time(dt, WritePrecision.NS)
            
            write_api.write(bucket=bucket, org=org, record=point)
            count += 1
        except Exception as e:
            print(f"❌ Error procesando registro {rec.get('id')}: {e}")

    print(f"✅ Sincronización completada. {count} puntos enviados a InfluxDB.")

if __name__ == "__main__":
    sync_data()
