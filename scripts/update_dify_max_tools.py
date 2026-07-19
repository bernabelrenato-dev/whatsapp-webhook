import os

path = '/home/USER/dify/docker/.env'
if os.path.exists(path):
    text = open(path).read()
    old_line = "MAX_TOOLS_NUM=10"
    new_line = "MAX_TOOLS_NUM=30"
    
    if old_line in text:
        updated = text.replace(old_line, new_line)
        open(path, 'w').write(updated)
        print("Updated Dify MAX_TOOLS_NUM to 30")
    else:
        # Check if defined differently
        lines = text.split('\n')
        replaced = False
        updated_lines = []
        for line in lines:
            if line.startswith("MAX_TOOLS_NUM="):
                updated_lines.append("MAX_TOOLS_NUM=30")
                replaced = True
            else:
                updated_lines.append(line)
        if replaced:
            open(path, 'w').write('\n'.join(updated_lines))
            print("Updated Dify MAX_TOOLS_NUM to 30")
        else:
            print("MAX_TOOLS_NUM not found in .env")
else:
    print(f"File {path} not found")
