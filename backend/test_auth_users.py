import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

print("Listing auth users:")
try:
    res = supabase.auth.admin.list_users()
    for u in res:
        print(f"ID: {u.id}, Email: {u.email}, Metadata: {u.user_metadata}")
except Exception as e:
    print("Error listing auth users:", e)
