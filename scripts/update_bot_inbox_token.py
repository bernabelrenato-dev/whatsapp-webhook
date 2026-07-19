import os

path = '/home/jgis/whatsapp-bot/.env'
if os.path.exists(path):
    text = open(path).read()
    
    # We want to replace CHATWOOT_ACCESS_TOKEN value
    lines = text.split('\n')
    updated = []
    for line in lines:
        if line.startswith('CHATWOOT_ACCESS_TOKEN='):
            updated.append('CHATWOOT_ACCESS_TOKEN=bhg1imAEk37dRybnkSe2t222')
            print("Replacing access token line")
        else:
            updated.append(line)
            
    open(path, 'w').write('\n'.join(updated))
    print("Successfully updated CHATWOOT_ACCESS_TOKEN in .env")
else:
    print(f"Error: Path {path} not found")
