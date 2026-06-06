import sqlite3

conn = sqlite3.connect("/tmp/grafana.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", [t[0] for t in tables])

for table in ["dashboard", "dashboard_version", "dashboard_snapshot"]:
    if (table,) in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"Table {table} has {count} rows")
        if count > 0:
            cursor.execute(f"SELECT id, uid, title FROM {table} LIMIT 5")
            print(cursor.fetchall())

conn.close()
