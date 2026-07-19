const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const chatwootController = require('../controllers/chatwoot.controller');
const verifyWhatsAppSignature = require('../middleware/signatureValidator');

// Ruta de verificación (GET)
router.get('/', webhookController.verifyWebhook);

// Ruta de recepción de mensajes (POST) - Protegida con el validador de firmas
router.post('/', verifyWhatsAppSignature, webhookController.receiveMessage);

// Ruta de recepción de mensajes de Chatwoot (POST)
router.post('/chatwoot-webhook', chatwootController.receiveChatwootMessage);
router.post('/chatwoot', chatwootController.receiveChatwootMessage);

module.exports = router;

