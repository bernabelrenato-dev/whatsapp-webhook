import json
import subprocess
import yaml

cmd = ["sudo", "docker", "exec", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-t", "-A", "-c", "SELECT id, model FROM app_model_configs;"]
res = subprocess.run(cmd, capture_output=True, text=True)

lines = res.stdout.strip().splitlines()
print(f"Setting max_tokens = 4096 for {len(lines)} rows...")

count = 0
for line in lines:
    parts = line.split('|')
    cid = parts[0]
    m_val = parts[1] if len(parts) > 1 else ''
    
    if m_val and m_val.startswith('{'):
        try:
            data = json.loads(m_val)
            if 'completion_params' in data:
                data['completion_params']['max_tokens'] = 4096
                m_fixed = json.dumps(data)
                m_esc = m_fixed.replace("'", "''")
                sql = f"UPDATE app_model_configs SET model = '{m_esc}' WHERE id = '{cid}';"
                up_cmd = ["sudo", "docker", "exec", "-i", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-c", sql]
                subprocess.run(up_cmd, check=True)
                count += 1
        except Exception as e:
            print(f"Err on {cid}: {e}")

print(f"UPDATED {count} ROWS WITH max_tokens = 4096 SUCCESSFULLY!")
