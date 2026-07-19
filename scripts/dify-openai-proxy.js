const http = require('http');

const PORT = 5002;
const DIFY_API_URL = process.env.DIFY_API_URL || 'http://api:5001/v1';

const server = http.createServer((req, res) => {
  console.log(`[PROXY] Received request: ${req.method} ${req.url}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];
  if (req.method === 'POST' && (cleanUrl === '/v1/chat/completions' || cleanUrl === '/chat/completions')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const messages = payload.messages || [];
        const lastMessage = messages[messages.length - 1];
        const isClientStreaming = !!payload.stream;
        
        let query = '';
        if (lastMessage) {
          if (typeof lastMessage.content === 'string') {
            query = lastMessage.content;
          } else if (Array.isArray(lastMessage.content)) {
            query = lastMessage.content
              .map(part => {
                if (part && typeof part === 'object') {
                  if (part.type === 'text') {
                    return part.text || '';
                  }
                }
                return '';
              })
              .filter(Boolean)
              .join('\n');
          } else if (lastMessage.content && typeof lastMessage.content === 'object') {
            query = lastMessage.content.text || '';
          }
        }

        const authHeader = req.headers['authorization'] || '';
        const apiKey = authHeader.replace('Bearer ', '').trim();

        console.log(`[PROXY] Parsed Query: "${query.substring(0, 60).replace(/\n/g, ' ')}..." (Key: ${apiKey.substring(0, 8)}..., Stream: ${isClientStreaming})`);

        const difyPayload = JSON.stringify({
          inputs: {},
          query: query,
          response_mode: 'streaming',
          user: 'telegram-user'
        });

        const targetUrl = `${DIFY_API_URL}/chat-messages`;
        console.log(`[PROXY] Forwarding to (streaming): ${targetUrl}`);

        const difyReq = http.request(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }, (difyRes) => {
          console.log(`[PROXY] Dify response status: ${difyRes.statusCode}`);
          
          if (difyRes.statusCode >= 400) {
            let errorBody = '';
            difyRes.on('data', chunk => { errorBody += chunk; });
            difyRes.on('end', () => {
              console.error(`[PROXY] Dify error body:`, errorBody);
              res.writeHead(difyRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(errorBody);
            });
            return;
          }

          if (isClientStreaming) {
            // Set SSE headers for streaming response to client
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            });

            let buffer = '';
            let chunkId = 'chatcmpl-' + Math.random().toString(36).substring(2);

            difyRes.on('data', chunk => {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop(); // Keep partial line

              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data:')) {
                  try {
                    const dataStr = cleanLine.substring(5).trim();
                    if (dataStr) {
                      const dataJson = JSON.parse(dataStr);
                      if ((dataJson.event === 'message' || dataJson.event === 'agent_message') && dataJson.answer) {
                        const openAiChunk = {
                          id: chunkId,
                          object: 'chat.completion.chunk',
                          created: Math.floor(Date.now() / 1000),
                          model: payload.model || 'dify-agent',
                          choices: [
                            {
                              index: 0,
                              delta: { content: dataJson.answer },
                              finish_reason: null
                            }
                          ]
                        };
                        res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
                      }
                    }
                  } catch (e) {}
                }
              }
            });

            difyRes.on('end', () => {
              // Process remaining buffer
              const cleanBuffer = buffer.trim();
              if (cleanBuffer.startsWith('data:')) {
                try {
                  const dataStr = cleanBuffer.substring(5).trim();
                  const dataJson = JSON.parse(dataStr);
                  if ((dataJson.event === 'message' || dataJson.event === 'agent_message') && dataJson.answer) {
                    const openAiChunk = {
                      id: chunkId,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: payload.model || 'dify-agent',
                      choices: [
                        {
                          index: 0,
                          delta: { content: dataJson.answer },
                          finish_reason: null
                        }
                      ]
                    };
                    res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
                  }
                } catch (e) {}
              }

              // Send final stop chunk
              const finalChunk = {
                id: chunkId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: payload.model || 'dify-agent',
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: 'stop'
                  }
                ]
              };
              res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
              console.log(`[PROXY] SSE Stream to client complete.`);
            });
          } else {
            // Aggregate response for blocking response to client
            let accumulatedAnswer = '';
            let buffer = '';

            difyRes.on('data', chunk => {
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
                      if ((dataJson.event === 'message' || dataJson.event === 'agent_message') && dataJson.answer) {
                        accumulatedAnswer += dataJson.answer;
                      }
                    }
                  } catch (e) {}
                }
              }
            });

            difyRes.on('end', () => {
              const cleanBuffer = buffer.trim();
              if (cleanBuffer.startsWith('data:')) {
                try {
                  const dataStr = cleanBuffer.substring(5).trim();
                  const dataJson = JSON.parse(dataStr);
                  if ((dataJson.event === 'message' || dataJson.event === 'agent_message') && dataJson.answer) {
                    accumulatedAnswer += dataJson.answer;
                  }
                } catch (e) {}
              }

              console.log(`[PROXY] Streaming complete. Total answer length: ${accumulatedAnswer.length}`);

              const openAiResponse = {
                id: 'chatcmpl-' + Math.random().toString(36).substring(2),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: payload.model || 'dify-agent',
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: accumulatedAnswer || 'No response from Dify.'
                    },
                    finish_reason: 'stop'
                  }
                ]
              };

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(openAiResponse));
            });
          }
        });

        difyReq.on('error', (err) => {
          console.error('[PROXY] Error requesting Dify:', err);
          res.writeHead(500);
          res.end('Error requesting Dify');
        });

        difyReq.write(difyPayload);
        difyReq.end();
      } catch (err) {
        console.error('[PROXY] Error processing request:', err);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else {
    console.log(`[PROXY] Path not matched: ${cleanUrl}, returning 404`);
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dify-to-OpenAI Proxy listening on port ${PORT}`);
});
