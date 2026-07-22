import re

nginx_conf = '/etc/nginx/sites-available/jgis-bot'

with open(nginx_conf, 'r') as f:
    content = f.read()

# Reemplazar la regla de /typebot para agregar el rewrite que elimina el prefijo redundante
old_pattern = r'location /typebot \{\s*proxy_pass http://localhost:8081;'
new_replacement = 'location /typebot/ {\n        rewrite ^/typebot/(.*)$ /$1 break;\n        proxy_pass http://localhost:8081;'

if re.search(old_pattern, content):
    new_content = re.sub(old_pattern, new_replacement, content)
    with open(nginx_conf, 'w') as f:
        f.write(new_content)
    print('✅ Nginx jgis-bot actualizado correctamente con reescritura de URL para /typebot/')
else:
    print('ℹ️ Nginx ya contaba con la regla o el patrón no coincidió.')
