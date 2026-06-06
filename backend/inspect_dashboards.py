import sqlite3
import json

conn = sqlite3.connect("/tmp/grafana.db")
cursor = conn.cursor()

cursor.execute("SELECT id, uid, title, data FROM dashboard")
dashboards = cursor.fetchall()

for db_id, uid, title, data_str in dashboards:
    print(f"=== Dashboard: {title} (ID: {db_id}, UID: {uid}) ===")
    data = json.loads(data_str)
    
    # Let's inspect panels
    panels = data.get("panels", [])
    print(f"Number of panels: {len(panels)}")
    for panel in panels:
        print(f"  Panel ID: {panel.get('id')} | Title: {panel.get('title')} | Type: {panel.get('type')}")
        targets = panel.get("targets", [])
        for target in targets:
            print(f"    Target RefId: {target.get('refId')}")
            print(f"    Query: {target.get('query')}")

conn.close()
