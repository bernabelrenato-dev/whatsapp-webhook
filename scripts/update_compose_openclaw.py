import os

path = '/home/jgis/ai-agents/docker-compose.yml'
if os.path.exists(path):
    text = open(path).read()
    
    old_command = "command: node openclaw.mjs gateway --allow-unconfigured --bind lan --port 8085"
    new_command = 'command: sh -c "node /home/node/.openclaw/dify-openai-proxy.js & node openclaw.mjs gateway --allow-unconfigured --bind lan --port 8085"'
    
    if old_command in text:
        updated = text.replace(old_command, new_command)
        open(path, 'w').write(updated)
        print("Successfully updated openclaw command in docker-compose.yml")
    else:
        print("Error: Could not find exact openclaw command line in docker-compose.yml")
else:
    print(f"Error: Path {path} not found")
