import os

path = '/home/jgis/ai-agents/openhands-mcp/src/openhands_mcp_server/server.py'
if os.path.exists(path):
    text = open(path).read()
    # Replace the initialization line to specify host="0.0.0.0"
    updated = text.replace('mcp = FastMCP("openhands-mcp-server")', 'mcp = FastMCP("openhands-mcp-server", host="0.0.0.0")')
    open(path, 'w').write(updated)
    print("Successfully updated FastMCP initialization host to 0.0.0.0 in server.py")
else:
    print(f"Error: Path {path} not found")
