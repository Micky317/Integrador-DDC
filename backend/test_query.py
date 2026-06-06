import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

print("--- PROFILES ---")
res = supabase.table("profiles").select("*").execute()
for r in res.data:
    print(r)

print("\n--- PACIENTES ---")
res = supabase.table("pacientes").select("*").execute()
for r in res.data:
    print(r)

print("\n--- ANALISIS ---")
res = supabase.table("analisis").select("*").order("created_at", desc=True).execute()
for r in res.data:
    print(r)

