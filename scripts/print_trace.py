import inspect
from mcp.server.fastmcp.server import FastMCP

try:
    print(inspect.getsource(FastMCP.handle_sse))
except Exception as e:
    print("Error:", e)
