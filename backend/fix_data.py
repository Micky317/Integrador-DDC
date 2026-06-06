import os
from dotenv import load_dotenv
from supabase import create_client, Client
from influxdb_client import InfluxDBClient
from sync_supabase_to_influx import sync_data

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

def fix_records():
    paciente_id = "e1b9b6a8-6482-4121-883b-786d6af70412" # Bebé Juanito Perez
    print(f"🔍 Consultando registros de Supabase para el paciente: {paciente_id}")
    
    response = supabase.table('analisis').select('*').eq('paciente_id', paciente_id).execute()
    records = response.data
    
    if not records:
        print("⚠️ No se encontraron registros para este paciente.")
        return
        
    print(f"📋 Encontrados {len(records)} registros en Supabase:")
    for rec in records:
        print(f"  - ID: {rec['id']} | Fecha Placa: {rec.get('fecha_radiografia')} | Izq: {rec['angulo_izq']}° | Der: {rec['angulo_der']}°")
        
    # Realizar actualizaciones
    updated_count = 0
    for rec in records:
        current_date = rec.get('fecha_radiografia')
        new_date = None
        if current_date == '2026-05-21':
            new_date = '2026-05-20'
        elif current_date == '2026-05-08':
            new_date = '2026-05-07'
            
        if new_date:
            print(f"🔄 Actualizando ID {rec['id']} de '{current_date}' a '{new_date}'...")
            supabase.table('analisis').update({'fecha_radiografia': new_date}).eq('id', rec['id']).execute()
            updated_count += 1
            
    print(f"✨ Se actualizaron {updated_count} registros en Supabase.")

def clear_influxdb():
    print(f"🗑️ Conectando a InfluxDB para limpiar la medición 'evolucion_clinica'...")
    client = InfluxDBClient(url=influx_url, token=token, org=org)
    delete_api = client.delete_api()
    
    # Borrar todos los datos de 'evolucion_clinica' en el bucket
    start_time = "1970-01-01T00:00:00Z"
    stop_time = "2030-01-01T00:00:00Z"
    predicate = '_measurement="evolucion_clinica"'
    
    try:
        delete_api.delete(
            start=start_time,
            stop=stop_time,
            predicate=predicate,
            bucket=bucket,
            org=org
        )
        print("✅ Medición 'evolucion_clinica' limpiada exitosamente en InfluxDB.")
    except Exception as e:
        print(f"❌ Error al limpiar InfluxDB: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    print("--- INICIANDO CORRECCIÓN DE DATOS ---")
    fix_records()
    clear_influxdb()
    
    # Sincronizar de nuevo para repoblar InfluxDB de forma limpia
    sync_data()
    print("--- CORRECCIÓN DE DATOS TERMINADA ---")
