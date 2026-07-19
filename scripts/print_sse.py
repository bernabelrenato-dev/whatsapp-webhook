import inspect
import mcp.server.sse

try:
    print(inspect.getsource(mcp.server.sse.connect_sse))
except Exception as e:
    print("Error:", e)
