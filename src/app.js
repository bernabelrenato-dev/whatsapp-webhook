const express = require('express');
const path = require('path');
const webhookRoutes = require('./routes/webhook.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

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

// Manejador global de excepciones
app.use(errorHandler);

module.exports = app;
