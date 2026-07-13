const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const verifyWhatsAppSignature = require('../middleware/signatureValidator');

// Ruta de verificación (GET)
router.get('/', webhookController.verifyWebhook);

// Ruta de recepción de mensajes (POST) - Protegida con el validador de firmas
router.post('/', verifyWhatsAppSignature, webhookController.receiveMessage);

module.exports = router;
