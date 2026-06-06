import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

print("PROFILES:")
res = supabase.table("profiles").select("*").execute()
for p in res.data:
    print(f"ID: {p['id']} | Nombre: {p['nombre_completo']} | Rol: {p['rol']} | Validado: {p.get('matricula_validada')}")

print("\nPACIENTES:")
res = supabase.table("pacientes").select("*").execute()
for p in res.data:
    print(f"ID: {p['id']} | Nombre: {p['nombre_completo']} | Medico ID: {p['medico_id']}")

print("\nANALISIS:")
res = supabase.table("analisis").select("id, paciente_id, medico_id, created_at, fecha_radiografia, angulo_izq, angulo_der, dx_izq, dx_der, categoria_graf").execute()
for r in res.data:
    print(r)
