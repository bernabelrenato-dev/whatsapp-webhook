import subprocess

sql = "UPDATE app_model_configs SET agent_mode = jsonb_set(agent_mode::jsonb, '{max_iteration}', '30'::jsonb)::text WHERE agent_mode IS NOT NULL AND agent_mode != '';"

cmd = ["sudo", "docker", "exec", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "dify", "-c", sql]

res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
