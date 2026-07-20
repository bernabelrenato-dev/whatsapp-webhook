import json
import os

path = '/home/jgis/ai-agents/config/openclaw/openclaw.json'
if os.path.exists(path):
    with open(path, 'r') as f:
        data = json.load(f)
    
    # Backup
    with open(path + '.bak.fix_model', 'w') as f:
        json.dump(data, f, indent=2)
    
    # Ensure model parameters are simple strings where expected
    if 'agents' in data and 'defaults' in data['agents']:
        model_val = data['agents']['defaults'].get('model')
        if isinstance(model_val, dict):
            primary_model = model_val.get('primary', 'gemini-2.0-flash')
            data['agents']['defaults']['model'] = primary_model

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        
    print("Successfully normalized model parameters in openclaw.json!")
else:
    print(f"Error: Path {path} not found")
