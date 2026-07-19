import os

path = '/home/jgis/ai-agents/.env'
if os.path.exists(path):
    text = open(path).read()
    # Replace Dify API Key placeholder with the real token provided by the user
    updated = text.replace('DIFY_API_KEY=tu_dify_api_key_de_workflow_aqui', 'DIFY_API_KEY=app-djKLJf4B1hNovBfEfe19Q0rX')
    open(path, 'w').write(updated)
    print("Successfully updated DIFY_API_KEY in .env")
else:
    print(f"Error: Path {path} not found")
