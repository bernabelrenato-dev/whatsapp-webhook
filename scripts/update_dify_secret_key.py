import os

path = '/home/USER/dify/docker/.env'
if os.path.exists(path):
    text = open(path).read()
    old_key = "DIFY_AGENT_SERVER_SECRET_KEY=8c3d2562d29ad90e6a9ee88fb5e0a6e0018f4a215570bb8e932fcc15cf399435"
    new_key = "DIFY_AGENT_SERVER_SECRET_KEY=_e-jIUo2rk3wfhTfhUr6nm0_Os7X1x4DBeeuCesC44s"
    
    if old_key in text:
        updated = text.replace(old_key, new_key)
        open(path, 'w').write(updated)
        print("Updated Dify env with new secure key")
    else:
        # Check if DIFY_AGENT_SERVER_SECRET_KEY is defined in another format
        print("Old key not found exactly. Checking lines...")
        lines = text.split('\n')
        updated_lines = []
        replaced = False
        for line in lines:
            if line.startswith("DIFY_AGENT_SERVER_SECRET_KEY="):
                updated_lines.append("DIFY_AGENT_SERVER_SECRET_KEY=_e-jIUo2rk3wfhTfhUr6nm0_Os7X1x4DBeeuCesC44s")
                replaced = True
                print("Replaced line starting with DIFY_AGENT_SERVER_SECRET_KEY")
            else:
                updated_lines.append(line)
        if replaced:
            open(path, 'w').write('\n'.join(updated_lines))
            print("Successfully updated Dify env")
        else:
            print("Error: DIFY_AGENT_SERVER_SECRET_KEY not found in .env")
else:
    print(f"Error: Path {path} not found")
