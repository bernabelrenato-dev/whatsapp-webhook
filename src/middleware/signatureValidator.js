const crypto = require('crypto');
const config = require('../config/environment');
const logger = require('../utils/logger');

module.exports = function verifyWhatsAppSignature(req, res, next) {
  // En desarrollo local sin APP_SECRET configurado, omitimos por comodidad de pruebas
  if (config.NODE_ENV === 'development' && !config.APP_SECRET) {
    logger.warn('Omitiendo validación de firma en entorno de desarrollo local.');
    return next();
  }

  if (!config.APP_SECRET) {
    logger.error('Petición rechazada: APP_SECRET no está configurada.');
    return res.status(500).json({ error: 'Configuración de seguridad incompleta' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    logger.error('Petición rechazada: Falta firma X-Hub-Signature-256 en cabeceras.');
    return res.status(401).json({ error: 'Firma requerida' });
  }

  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    logger.error('Petición rechazada: Formato de firma inválido.');
    return res.status(400).json({ error: 'Formato de firma inválido' });
  }

  const signatureHash = parts[1];
  
  const expectedHash = crypto
    .createHmac('sha256', config.APP_SECRET)
    .update(req.rawBody || '')
    .digest('hex');

  const signatureBuf = Buffer.from(signatureHash, 'utf8');
  const expectedBuf = Buffer.from(expectedHash, 'utf8');

  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    logger.error('Petición rechazada: La firma HMAC SHA256 no coincide.');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  logger.debug('Firma del Webhook verificada correctamente.');
  next();
};
