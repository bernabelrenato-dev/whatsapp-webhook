import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'

if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    # Backup
    backup_path = path + '.bak.deepseek'
    with open(backup_path, 'w') as f:
        json.dump(data, f, indent=2)

    # Configure DeepSeek Provider & Models
    if 'models' not in data:
        data['models'] = {}
    
    data['models']['mode'] = "merge"
    if 'providers' not in data['models']:
        data['models']['providers'] = {}

    # Cargar API key desde .env o usar fallback robusto
    def load_env_key(path_to_env, key_name):
        if os.path.exists(path_to_env):
            with open(path_to_env, 'r') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        k, v = line.split('=', 1)
                        if k.strip() == key_name:
                            return v.strip().strip('"').strip("'")
        return None

    deepseek_key = (
        load_env_key('/home/jgis/ai-agents/.env', 'DEEPSEEK_API_KEY') or 
        load_env_key('/home/jgis/whatsapp-bot/.env', 'DEEPSEEK_API_KEY') or 
        os.environ.get('DEEPSEEK_API_KEY') or 
        'sk-db343927d3f0466388fd2c4515e3d41c'
    )

    data['models']['providers']['deepseek'] = {
        "baseUrl": "https://api.deepseek.com",
        "apiKey": deepseek_key,
        "api": "openai-completions",
        "models": [
            {
                "id": "deepseek-chat",
                "name": "DeepSeek Chat V3 / R1",
                "contextWindow": 131072,
                "maxTokens": 8192
            },
            {
                "id": "deepseek-coder",
                "name": "DeepSeek Coder",
                "contextWindow": 131072,
                "maxTokens": 8192
            }
        ]
    }

    # Configure Dify Provider & Models
    data['models']['providers']['dify'] = {
        "baseUrl": "http://localhost:5002/v1",
        "apiKey": "app-djKLJf4B1hNovBfEfe19Q0rX",
        "api": "openai-completions",
        "models": [
            {
                "id": "dify-agent",
                "name": "Dify Agent",
                "contextWindow": 131072,
                "maxTokens": 8192
            }
        ]
    }

    # Set primary model as direct string (fixing model parameter error)
    if 'agents' not in data:
        data['agents'] = {}
    
    data['agents']['defaults'] = {
        "model": "deepseek/deepseek-chat"
    }



    if 'agents' in data and 'defaults' in data['agents']:
        data['agents']['defaults'].pop('systemPrompt', None)

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        
    print("Successfully configured DeepSeek provider with valid schema in openclaw.json!")
else:
    print(f"Error: Path {path} not found")
