import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'

if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    # Backup
    backup_path = path + '.bak.mcp'
    with open(backup_path, 'w') as f:
        json.dump(data, f, indent=2)

    # Inject MCP tools configuration into OpenClaw
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
        
    print("Successfully configured OpenHands, OpenCode and Hostinger MCP tools in openclaw.json!")
else:
    print(f"Error: Path {path} not found")
