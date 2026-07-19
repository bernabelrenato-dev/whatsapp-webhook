import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'
if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    if 'models' in data and 'providers' in data['models'] and 'dify' in data['models']['providers']:
        data['models']['providers']['dify']['baseUrl'] = 'http://localhost:5002/v1'
        
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully updated Dify baseUrl in openclaw.json to http://localhost:5002/v1")
else:
    print(f"Error: Path {path} not found")
