import os

path = '/home/jgis/ai-agents/openhands-mcp/src/openhands_mcp_server/server.py'
if os.path.exists(path):
    text = open(path).read()
    updated = text.replace('transport="streamable-http"', 'transport="sse"')
    open(path, 'w').write(updated)
    print("Successfully replaced transport to 'sse' in server.py")
else:
    print(f"Error: Path {path} not found")
