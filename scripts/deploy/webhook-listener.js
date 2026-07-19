/**
 * GitHub Webhook Listener — Auto-Deploy para JGIS Publicidad
 * 
 * Escucha webhooks de GitHub (push a main) y ejecuta el script de deploy.
 * Valida firma HMAC-SHA256 para seguridad.
 * 
 * Variables de entorno:
 *   DEPLOY_SECRET  — Shared secret configurado en GitHub webhook
 *   DEPLOY_PORT    — Puerto del listener (default: 9000)
 *   DEPLOY_BRANCH  — Rama a monitorear (default: main)
 *   DEPLOY_SCRIPT  — Path al script de deploy (default: ./deploy.sh)
 */

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.DEPLOY_PORT || '9000', 10);
const SECRET = process.env.DEPLOY_SECRET;
const BRANCH = process.env.DEPLOY_BRANCH || 'master';
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || path.join(__dirname, 'deploy.sh');
const LOG_FILE = process.env.DEPLOY_LOG || '/home/jgis/whatsapp-bot/deploy.log';

if (!SECRET) {
  console.error('[DEPLOY] FATAL: DEPLOY_SECRET no está configurado. Abortando.');
  process.exit(1);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    // Si no puede escribir al log file, solo imprime en consola
  }
}

function verifySignature(payload, signature) {
  if (!signature) return false;
  const sig = signature.replace('sha256=', '');
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload, 'utf8');
  const digest = hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex'));
  } catch (e) {
    return false;
  }
}

let deployInProgress = false;

function runDeploy(commitInfo) {
  if (deployInProgress) {
    log(`SKIP: Deploy ya en progreso. Ignorando push de ${commitInfo}`);
    return;
  }

  deployInProgress = true;
  log(`DEPLOY START: Ejecutando deploy para ${commitInfo}`);

  execFile('/bin/bash', [DEPLOY_SCRIPT], {
    cwd: path.dirname(DEPLOY_SCRIPT),
    timeout: 300000, // 5 minutos máximo
    env: { ...process.env, DEPLOY_COMMIT_INFO: commitInfo }
  }, (error, stdout, stderr) => {
    deployInProgress = false;
    if (error) {
      log(`DEPLOY FAIL: ${error.message}`);
      if (stderr) log(`STDERR: ${stderr}`);
    } else {
      log(`DEPLOY OK: ${stdout.trim()}`);
    }
  });
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', deployInProgress }));
    return;
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });

  req.on('end', () => {
    // Verificar firma HMAC
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, signature)) {
      log('REJECTED: Firma HMAC inválida');
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    // Parsear payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      log('REJECTED: JSON inválido');
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    // Verificar evento (solo push events)
    const event = req.headers['x-github-event'];
    if (event === 'ping') {
      log('PING: GitHub webhook configurado correctamente');
      res.writeHead(200);
      res.end('pong');
      return;
    }

    if (event !== 'push') {
      log(`SKIP: Evento '${event}' ignorado (solo se procesa 'push')`);
      res.writeHead(200);
      res.end('Ignored');
      return;
    }

    // Verificar rama
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');
    if (branch !== BRANCH) {
      log(`SKIP: Push a rama '${branch}' ignorado (solo se procesa '${BRANCH}')`);
      res.writeHead(200);
      res.end('Ignored');
      return;
    }

    // Extraer info del commit
    const pusher = payload.pusher?.name || 'unknown';
    const headCommit = payload.head_commit?.message || 'no message';
    const commitSha = payload.head_commit?.id?.substring(0, 7) || 'unknown';
    const commitInfo = `${commitSha} by ${pusher}: "${headCommit}"`;

    log(`ACCEPTED: Push a '${BRANCH}' — ${commitInfo}`);

    // Responder inmediatamente, deploy en background
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'deploying', commit: commitSha }));

    // Ejecutar deploy
    runDeploy(commitInfo);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  log(`Webhook listener activo en puerto ${PORT}, monitoreando rama '${BRANCH}'`);
});
