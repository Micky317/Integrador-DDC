import os
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(url, key)

def seed_database():
    print("Creando usuarios demonstativos en Supabase...")

    # ==========================
    # 1. CREAR MÉDICO
    # ==========================
    try:
        medico_res = supabase.auth.admin.create_user({
            "email": "medico@tesis.com",
            "password": "password123",
            "email_confirm": True,
            "user_metadata": {
                "rol": "medico",
                "nombre_completo": "Dr. Miguel Ángel (Tesis)"
            }
        })
        medico_id = medico_res.user.id
        print("✅ Médico creado: medico@tesis.com / password123")
    except Exception as e:
        print("⚠️ Médico ya existe o error:", e)
        # Si ya existe, buscarlo
        # Esto falla si no existe, pero es solo para semilla
        users = supabase.auth.admin.list_users()
        medico_user = next((u for u in users if u.email == "medico@tesis.com"), None)
        if medico_user:
            medico_id = medico_user.id
        else:
            return

    # ==========================
    # 2. CREAR PADRE
    # ==========================
    try:
        padre_res = supabase.auth.admin.create_user({
            "email": "padre@tesis.com",
            "password": "password123",
            "email_confirm": True,
            "user_metadata": {
                "rol": "padre",
                "nombre_completo": "Carlos Perez (Padre de Prueba)"
            }
        })
        padre_id = padre_res.user.id
        print("✅ Padre creado: padre@tesis.com / password123")
    except Exception as e:
        print("⚠️ Padre ya existe o error:", e)
        users = supabase.auth.admin.list_users()
        padre_user = next((u for u in users if u.email == "padre@tesis.com"), None)
        if padre_user:
            padre_id = padre_user.id
        else:
            return

    # ==========================
    # 3. CREAR PACIENTE DE PRUEBA
    # ==========================
    try:
        paciente_data = {
            "nombre_completo": "Bebé Juanito Perez",
            "fecha_nacimiento": "2025-10-15",
            "sexo": "M",
            "medico_id": medico_id,
            "padre_id": padre_id
        }
        
        # Verificar si ya existe para no duplicar en múltiples corridas
        existente = supabase.table("pacientes").select("*").eq("padre_id", padre_id).execute()
        
        if len(existente.data) == 0:
            res = supabase.table("pacientes").insert(paciente_data).execute()
            print("✅ Paciente bebé de prueba creado e ingresado a la DB.")
        else:
            print("✅ El paciente bebé ya estaba en la base de datos.")
            
    except Exception as e:
        print("❌ Error al crear paciente:", e)

    print("\n🎉 DATOS DE PRUEBA LISTOS!")
    print("------------------------------------------")
    print("MÉDICO PREDETERMINADO")
    print("Email: medico@tesis.com")
    print("Pass:  password123")
    print("------------------------------------------")
    print("PADRE PREDETERMINADO")
    print("Email: padre@tesis.com")
    print("Pass:  password123")

if __name__ == "__main__":
    seed_database()
