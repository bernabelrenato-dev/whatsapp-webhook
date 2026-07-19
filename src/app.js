// ==============================================================================
// Webhook WhatsApp - JGIS Publicidad
// Sistema Orquestado por Antigravity + REGE Agents (OpenClaw, OpenCode, OpenHands)
// Auto-Deploy Activo vía GitHub Webhook (HMAC-SHA256)
// Última actualización: 2026-07-19
// ==============================================================================
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const webhookRoutes = require('./routes/webhook.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Confiar en el proxy inverso (Cloudflare Tunnel) para rate-limiting correcto
app.set('trust proxy', 1);

// Configuración de rate limiting global para proteger APIs
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Limitar a 60 peticiones por minuto por IP
  message: {
    error: 'Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

// Servir imágenes estáticas de los productos del catálogo
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));


// Capturamos el body original en bytes (rawBody) antes de parsearlo como JSON.
// Esto es requerido para la verificación HMAC SHA256 de las firmas de Meta.
app.use(express.json({
  limit: '5mb', // Meta especifica que las cargas útiles de los webhooks pueden pesar hasta 3MB
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));

// Servir un endpoint raíz básico por comodidad
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor Webhook para WhatsApp Cloud API listo.',
    endpoints: {
      webhook_verification: 'GET /webhook',
      webhook_events: 'POST /webhook',
      chatwoot_webhook: 'POST /webhook/chatwoot-webhook'
    }

  });
});

// Rutas del Webhook
app.use('/webhook', webhookRoutes);

// Rutas de API para integraciones (Typebot, etc.)
const apiRoutes = require('./routes/api.routes');
app.use('/api', apiRoutes);

// Manejador global de excepciones
app.use(errorHandler);

module.exports = app;
