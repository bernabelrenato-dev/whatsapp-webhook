import json
import os

path = '/home/jgis/ai-agents/config/openclaw/agents/main/agent/models.json'
if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    if 'providers' in data and 'dify' in data['providers']:
        data['providers']['dify']['baseUrl'] = 'http://localhost:5002/v1'
        
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully updated Dify baseUrl in agent models.json to http://localhost:5002/v1")
else:
    print(f"Error: Path {path} not found")
