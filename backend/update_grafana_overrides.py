import urllib.request
import json
import os

url_get = "http://localhost:3001/api/dashboards/uid/adhdgt8"
url_post = "http://localhost:3001/api/dashboards/db"
debug_file = "backend/dashboard_debug.json"

try:
    # 1. Fetch current dashboard config from Grafana
    print("Fetching dashboard from Grafana API...")
    req = urllib.request.Request(url_get)
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode())
        
    dashboard = res_data["dashboard"]
    
    # 2. Modify Panel 1 field configurations
    panels = dashboard.get("panels", [])
    updated = False
    
    for panel in panels:
        if panel.get("id") == 1:
            print("Found panel ID 1 (Seguimiento de Evolución Clínica)")
            field_config = panel.setdefault("fieldConfig", {})
            defaults = field_config.setdefault("defaults", {})
            
            # Remove global displayName if present
            if "displayName" in defaults:
                print("Removing global default displayName...")
                del defaults["displayName"]
                
            # Add specific overrides for angulo_izquierdo and angulo_derecho
            field_config["overrides"] = [
                {
                    "matcher": {
                        "id": "byName",
                        "options": "angulo_izquierdo"
                    },
                    "properties": [
                        {
                            "id": "displayName",
                            "value": "Ángulo Izquierdo"
                        }
                    ]
                },
                {
                    "matcher": {
                        "id": "byName",
                        "options": "angulo_derecho"
                    },
                    "properties": [
                        {
                            "id": "displayName",
                            "value": "Ángulo Derecho"
                        }
                    ]
                }
            ]
            updated = True
            print("Added overrides for 'angulo_izquierdo' and 'angulo_derecho'.")

    if updated:
        # 3. Post back to Grafana
        payload = {
            "dashboard": dashboard,
            "overwrite": True
        }
        
        print("Posting updated dashboard back to Grafana...")
        data = json.dumps(payload).encode('utf-8')
        req_post = urllib.request.Request(
            url_post, 
            data=data, 
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req_post) as response:
            result = json.loads(response.read().decode())
            print("Successfully updated Grafana dashboard config:", result)
            
        # 4. Save to dashboard_debug.json for sync/debug purposes
        print(f"Saving updated dashboard configuration to {debug_file}...")
        full_debug_data = {
            "meta": res_data.get("meta", {}),
            "dashboard": dashboard
        }
        with open(debug_file, "w", encoding="utf-8") as f:
            json.dump(full_debug_data, f, indent=2, ensure_ascii=False)
        print("Successfully saved local debug JSON.")
    else:
        print("⚠️ Panel with ID 1 was not found in the dashboard config.")
        
except Exception as e:
    print("❌ Error updating Grafana dashboard overrides:", e)
