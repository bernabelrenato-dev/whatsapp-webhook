import os

path = '/home/jgis/whatsapp-bot/docker-compose.yml'
if os.path.exists(path):
    text = open(path).read()
    
    old_line = "- FRONTEND_URL=http://localhost:3010"
    new_line = "- FRONTEND_URL=https://chatwoot.jgispublicidad.pe"
    
    if old_line in text:
        updated = text.replace(old_line, new_line)
        open(path, 'w').write(updated)
        print("Successfully updated Chatwoot FRONTEND_URL in docker-compose.yml")
    else:
        print("Error: Could not find FRONTEND_URL line in docker-compose.yml")
else:
    print(f"Error: Path {path} not found")
