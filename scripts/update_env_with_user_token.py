import os

path = '/home/jgis/whatsapp-bot/.env'
if os.path.exists(path):
    text = open(path).read()
    lines = text.split('\n')
    updated = []
    for line in lines:
        if line.startswith('CHATWOOT_ACCESS_TOKEN='):
            updated.append('CHATWOOT_ACCESS_TOKEN=4VvHvnfBsBZUPQNwkfnbZF2q')
            print("Updated access token in env")
        else:
            updated.append(line)
    open(path, 'w').write('\n'.join(updated))
    print("Env updated successfully")
else:
    print("Env file not found")
