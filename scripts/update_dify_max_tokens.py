import json
import subprocess

cmd = "sudo docker exec docker-db_postgres-1 psql -U postgres -d dify -t -A -c \"SELECT id, model, agent_mode FROM app_model_configs;\""
out = subprocess.check_output(cmd, shell=True).decode('utf-8')
count = 0

for line in out.strip().splitlines():
    parts = line.split('|')
    if len(parts) >= 3:
        cid, m_str, a_str = parts[0], parts[1], parts[2]
        updated = False
        
        if m_str and m_str.startswith('{'):
            try:
                mj = json.loads(m_str)
                if 'completion_params' in mj:
                    mj['completion_params']['max_tokens'] = 8192
                    m_str = json.dumps(mj)
                    updated = True
            except Exception as e:
                pass
                
        if a_str and a_str.startswith('{'):
            try:
                aj = json.loads(a_str)
                aj['max_iteration'] = 30
                a_str = json.dumps(aj)
                updated = True
            except Exception as e:
                pass
                
        if updated:
            m_esc = m_str.replace("'", "''")
            a_esc = a_str.replace("'", "''")
            sql = f"UPDATE app_model_configs SET model = '{m_esc}', agent_mode = '{a_esc}' WHERE id = '{cid}';"
            up_cmd = f"sudo docker exec docker-db_postgres-1 psql -U postgres -d dify -c \"{sql}\""
            subprocess.call(up_cmd, shell=True)
            count += 1

print(f"Updated {count} app_model_configs in Dify DB successfully!")
