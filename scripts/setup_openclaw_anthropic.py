import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'

if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    # Backup
    backup_path = path + '.bak.anthropic'
    with open(backup_path, 'w') as f:
        json.dump(data, f, indent=2)

    # Configure Anthropic Provider & Models
    if 'models' not in data:
        data['models'] = {}
    
    data['models']['mode'] = "merge"
    if 'providers' not in data['models']:
        data['models']['providers'] = {}

    anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')

    data['models']['providers']['anthropic'] = {
        "apiKey": anthropic_key,
        "models": [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "contextWindow": 200000,
                "maxTokens": 8192
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "contextWindow": 200000,
                "maxTokens": 8192
            }
        ]
    }

    # Set primary model as string (fixing the model parameter error)
    if 'agents' not in data:
        data['agents'] = {}
    
    data['agents']['defaults'] = {
        "model": "anthropic/claude-3-5-sonnet-20241022"
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
        
    print("Successfully configured Anthropic provider + String Model + MCP tools in openclaw.json!")
else:
    print(f"Error: Path {path} not found")
