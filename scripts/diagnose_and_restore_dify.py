import subprocess

# Let's inspect all rows of app_model_configs
cmd = ["sudo", "docker", "exec", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-t", "-A", "-c", "SELECT id, model, agent_mode FROM app_model_configs;"]
res = subprocess.run(cmd, capture_output=True, text=True)

lines = res.stdout.strip().splitlines()
print(f"Total rows in app_model_configs: {len(lines)}")

for idx, line in enumerate(lines):
    parts = line.split('|')
    cid = parts[0]
    m_val = parts[1] if len(parts) > 1 else ''
    a_val = parts[2] if len(parts) > 2 else ''
    
    print(f"--- ROW {idx+1} [ID: {cid}] ---")
    print("MODEL:", m_val)
    print("AGENT_MODE:", a_val[:100])
