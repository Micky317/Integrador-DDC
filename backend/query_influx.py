import os
from influxdb_client import InfluxDBClient
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("INFLUXDB_URL", "http://localhost:8086")
token = os.getenv("INFLUXDB_TOKEN")
org = os.getenv("INFLUXDB_ORG", "pasitos_firmes")
bucket = os.getenv("INFLUXDB_BUCKET", "telemetry")

if not token:
    print("❌ Error: No se encontró INFLUXDB_TOKEN en el archivo .env")
    exit(1)

client = InfluxDBClient(url=url, token=token, org=org)
query_api = client.query_api()

query = f'from(bucket: "{bucket}") |> range(start: -90d) |> filter(fn: (r) => r["_measurement"] == "evolucion_clinica")'
tables = query_api.query(query, org=org)

print("--- INFLUXDB evolucion_clinica POINTS ---")
points = {}
for table in tables:
    for record in table.records:
        t = record.get_time()
        p_id = record.values.get("paciente_id")
        m_id = record.values.get("medico_id")
        field = record.get_field()
        value = record.get_value()
        
        key = (t, p_id, m_id)
        if key not in points:
            points[key] = {}
        points[key][field] = value

for (t, p_id, m_id), fields in sorted(points.items(), key=lambda x: x[0][0]):
    print(f"Time: {t} | Paciente: {p_id} | Medico: {m_id} | Fields: {fields}")
