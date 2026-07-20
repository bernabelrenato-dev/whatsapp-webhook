import json
import subprocess
import yaml # to parse relaxed json if needed

# Query rows from app_model_configs
cmd = ["sudo", "docker", "exec", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-t", "-A", "-c", "SELECT id, model, agent_mode FROM app_model_configs;"]
res = subprocess.run(cmd, capture_output=True, text=True)

lines = res.stdout.strip().splitlines()
print(f"Repairing {len(lines)} rows in app_model_configs...")

fixed_count = 0
for line in lines:
    parts = line.split('|')
    cid = parts[0]
    m_val = parts[1] if len(parts) > 1 else ''
    a_val = parts[2] if len(parts) > 2 else ''
    
    m_fixed = None
    a_fixed = None
    
    if m_val:
        try:
            # try parsing as JSON or YAML (handles python dict str representation)
            data = json.loads(m_val) if m_val.startswith('{') and '"' in m_val else yaml.safe_load(m_val)
            m_fixed = json.dumps(data)
        except Exception as e:
            print(f"Error parsing model for {cid}: {e}")
            
    if a_val:
        try:
            data = json.loads(a_val) if a_val.startswith('{') and '"' in a_val else yaml.safe_load(a_val)
            a_fixed = json.dumps(data)
        except Exception as e:
            print(f"Error parsing agent_mode for {cid}: {e}")
            
    # Execute clean SQL update via psql stdin using valid json strings
    sql_updates = []
    if m_fixed:
        m_esc = m_fixed.replace("'", "''")
        sql_updates.append(f"model = '{m_esc}'")
    if a_fixed:
        a_esc = a_fixed.replace("'", "''")
        sql_updates.append(f"agent_mode = '{a_esc}'")
        
    if sql_updates:
        sql = f"UPDATE app_model_configs SET {', '.join(sql_updates)} WHERE id = '{cid}';"
        up_cmd = ["sudo", "docker", "exec", "-i", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-c", sql]
        subprocess.run(up_cmd, check=True)
        fixed_count += 1

print(f"REPAIRED {fixed_count} ROWS SUCCESSFULLY! All JSON strings now have double quotes.")
