import express from 'express';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import readline from 'readline';

const app = express();
app.use(express.json());

// Allow CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const sessions = new Map();

// Parse command to run from command line arguments
// Example: node mcp-sse-bridge.js --command npx --args "-y hostinger-api-mcp@latest"
const cmdIndex = process.argv.indexOf('--command');
if (cmdIndex === -1 || !process.argv[cmdIndex + 1]) {
  console.error("Error: --command argument is required");
  process.exit(1);
}
const command = process.argv[cmdIndex + 1];

const argsIndex = process.argv.indexOf('--args');
const argsStr = argsIndex !== -1 ? process.argv[argsIndex + 1] : '';
const args = argsStr ? argsStr.split(' ') : [];

console.log(`Starting MCP SSE Bridge for: ${command} ${args.join(' ')}`);

// SSE connection endpoint
app.get('/sse', (req, res) => {
  const sessionId = randomUUID();
  console.log(`[SSE] New connection request. Assigning sessionId: ${sessionId}`);

  // Start the stdio child process
  const child = spawn(command, args, {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, forward stderr to container logs
  });

  // Setup SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send the endpoint mapping event
  res.write(`event: endpoint\ndata: /message?sessionId=${sessionId}\n\n`);

  sessions.set(sessionId, { res, child });

  // Use readline to parse child stdout line-by-line, avoiding stream chunk fragmentation bugs
  const rl = readline.createInterface({
    input: child.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (line.trim()) {
      // Print truncated line in bridge logs to avoid logging huge payloads
      console.log(`[Child -> Client] ${sessionId} (length ${line.length}): ${line.substring(0, 100)}...`);
      res.write(`event: message\ndata: ${line}\n\n`);
    }
  });

  // Handle process exit
  child.on('close', (code) => {
    console.log(`[Child] Process exited for session ${sessionId} with code ${code}`);
    cleanupSession(sessionId);
  });

  // Handle client disconnection
  req.on('close', () => {
    console.log(`[SSE] Client closed connection for session ${sessionId}`);
    cleanupSession(sessionId);
  });
});

// Message posting endpoint
app.post('/message', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).send('Session not found');
  }

  const session = sessions.get(sessionId);
  const messageStr = JSON.stringify(req.body);
  console.log(`[Client -> Child] ${sessionId}: ${messageStr}`);
  
  session.child.stdin.write(messageStr + '\n');
  res.sendStatus(200);
});

function cleanupSession(sessionId) {
  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    sessions.delete(sessionId);
    try {
      session.child.kill();
    } catch (e) {
      // ignore
    }
    try {
      session.res.end();
    } catch (e) {
      // ignore
    }
    console.log(`[Cleanup] Session ${sessionId} cleaned up successfully`);
  }
}

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`MCP SSE Bridge listening on http://0.0.0.0:${port}`);
});
