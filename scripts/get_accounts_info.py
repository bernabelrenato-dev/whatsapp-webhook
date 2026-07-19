import subprocess

try:
    cmd = [
        "sudo", "docker", "exec", "jgis-postgres", 
        "psql", "-U", "postgres", "-d", "chatwoot_production", 
        "-c", "SELECT id, name FROM accounts;"
    ]
    out = subprocess.check_output(cmd).decode()
    print("Accounts:")
    print(out)
    
    cmd2 = [
        "sudo", "docker", "exec", "jgis-postgres", 
        "psql", "-U", "postgres", "-d", "chatwoot_production", 
        "-c", "SELECT * FROM account_users;"
    ]
    out2 = subprocess.check_output(cmd2).decode()
    print("Account Users:")
    print(out2)
except Exception as e:
    print("Error:", e)
