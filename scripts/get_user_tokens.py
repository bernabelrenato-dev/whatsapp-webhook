import subprocess

try:
    cmd = [
        "sudo", "docker", "exec", "jgis-postgres", 
        "psql", "-U", "postgres", "-d", "chatwoot_production", 
        "-c", "SELECT * FROM access_tokens;"
    ]
    out = subprocess.check_output(cmd).decode()
    print("Access Tokens:")
    print(out)
    
    cmd2 = [
        "sudo", "docker", "exec", "jgis-postgres", 
        "psql", "-U", "postgres", "-d", "chatwoot_production", 
        "-c", "SELECT id, email, name FROM users;"
    ]
    out2 = subprocess.check_output(cmd2).decode()
    print("Users:")
    print(out2)
except Exception as e:
    print("Error:", e)
