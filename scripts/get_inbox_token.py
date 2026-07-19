import subprocess

try:
    cmd = [
        "sudo", "docker", "exec", "jgis-postgres", 
        "psql", "-U", "postgres", "-d", "chatwoot_production", 
        "-c", "SELECT * FROM channel_api;"
    ]
    out = subprocess.check_output(cmd).decode()
    print("Channel API:")
    print(out)
except Exception as e:
    print("Error:", e)
