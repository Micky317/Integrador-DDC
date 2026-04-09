import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Instancia global de Supabase para el backend (usando la Service Role Key para tener privilegios de admin)
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("⚠️ ADVERTENCIA: Variables de Supabase no configuradas en el entorno del backend.")

supabase_client: Client | None = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None
