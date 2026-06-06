import urllib.request
import json

url_get = "http://localhost:3001/api/dashboards/uid/adhdgt8"
url_post = "http://localhost:3001/api/dashboards/db"

try:
    # 1. Fetch dashboard
    req = urllib.request.Request(url_get)
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode())
        
    dashboard = res_data["dashboard"]
    
    # 2. Modify timezone and query
    dashboard["timezone"] = "utc"
    
    panels = dashboard.get("panels", [])
    updated = False
    for panel in panels:
        if panel.get("id") == 1: # Seguimiento de Evolución Clínica
            targets = panel.get("targets", [])
            for target in targets:
                query = target.get("query", "")
                if "aggregateWindow" in query:
                    # Remove the aggregateWindow line
                    lines = query.split("\n")
                    new_lines = [l for l in lines if "aggregateWindow" not in l]
                    target["query"] = "\n".join(new_lines)
                    print(f"Updated query for panel {panel.get('id')}:")
                    print(target["query"])
                    updated = True

    if updated:
        # 3. Wrap in update payload
        payload = {
            "dashboard": dashboard,
            "overwrite": True
        }
        
        # 4. Post back
        data = json.dumps(payload).encode('utf-8')
        req_post = urllib.request.Request(
            url_post, 
            data=data, 
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req_post) as response:
            result = json.loads(response.read().decode())
            print("Success updating Grafana dashboard query:", result)
    else:
        print("No panels with aggregateWindow found or already updated.")
except Exception as e:
    print("Error updating dashboard query:", e)
