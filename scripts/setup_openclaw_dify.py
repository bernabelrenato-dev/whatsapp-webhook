import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'
if os.path.exists(path):
    # Backup first
    backup_path = path + '.bak.dify'
    with open(path, 'r') as f:
        data = json.load(f)
    
    with open(backup_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    # Configure dify provider and agents defaults
    data['models'] = {
        "mode": "merge",
        "providers": {
            "dify": {
                "baseUrl": "http://api:5001/v1",
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
        }
    }
    
    data['agents'] = {
        "defaults": {
            "model": {
                "primary": "dify/dify-agent"
            }
        }
    }
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        
    print("Successfully configured OpenClaw to use Dify as custom provider!")
else:
    print(f"Error: Path {path} not found")
