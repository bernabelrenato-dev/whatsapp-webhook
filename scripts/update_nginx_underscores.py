import os

path = '/etc/nginx/sites-available/chatwoot'
if os.path.exists(path):
    text = open(path).read()
    
    old_target = "server_name chatwoot.jgispublicidad.pe;"
    new_target = "server_name chatwoot.jgispublicidad.pe;\n    underscores_in_headers on;"
    
    if old_target in text and "underscores_in_headers on;" not in text:
        updated = text.replace(old_target, new_target, 1) # only replace the first occurrence (443 block)
        open(path, 'w').write(updated)
        print("Updated Nginx configuration with underscores_in_headers on")
    else:
        print("Target not found or already updated")
else:
    print(f"Error: Path {path} not found")
