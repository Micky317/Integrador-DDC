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
    
    # 2. Update timezone to utc
    dashboard["timezone"] = "utc"
    
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
        print("Success updating Grafana dashboard:", result)
except Exception as e:
    print("Error updating dashboard:", e)
