const http = require('http');

const sseReq = http.request('http://opencode-mcp:3000/sse', { method: 'GET' }, (sseRes) => {
  let buffer = '';
  sseRes.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('data:')) {
        try {
          const dataStr = cleanLine.substring(5).trim();
          if (dataStr) {
            const dataJson = JSON.parse(dataStr);
            if (dataJson.result && dataJson.result.tools) {
              console.log('Tools available in OpenCode MCP:');
              dataJson.result.tools.forEach(t => {
                console.log(`- ${t.name}: ${t.description.substring(0, 100)}`);
              });
              process.exit(0);
            }
          }
        } catch (e) {}
      }
    }
    
    const match = chunk.toString().match(/event:\s*endpoint[^\n]*\ndata:\s*([^\n]+)/i);
    if (match) {
      const endpoint = match[1].trim();
      console.log('Found POST endpoint:', endpoint);
      
      const listPayload = JSON.stringify({
        method: 'tools/list',
        jsonrpc: '2.0',
        id: 1
      });
      
      const postReq = http.request(`http://opencode-mcp:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (postRes) => {
        postRes.resume();
      });
      postReq.write(listPayload);
      postReq.end();
    }
  });
});

sseReq.end();
