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

    deepseek_key = os.environ.get('DEEPSEEK_API_KEY', '')

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

    # Set primary model as direct string (fixing model parameter error)
    if 'agents' not in data:
        data['agents'] = {}
    
    data['agents']['defaults'] = {
        "model": "deepseek/deepseek-chat"
    }

    # Inject MCP tools
    if 'mcpServers' not in data:
        data['mcpServers'] = {}

    data['mcpServers']['openhands'] = {
        "url": "http://jgis-openhands-mcp:6363/sse",
        "transport": "sse"
    }
    
    data['mcpServers']['opencode'] = {
        "url": "http://jgis-opencode-mcp:3000/sse",
        "transport": "sse"
    }

    data['mcpServers']['hostinger'] = {
        "url": "http://jgis-hostinger-mcp:3000/sse",
        "transport": "sse"
    }

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        
    print("Successfully configured DeepSeek provider + String Model + MCP tools in openclaw.json!")
else:
    print(f"Error: Path {path} not found")
