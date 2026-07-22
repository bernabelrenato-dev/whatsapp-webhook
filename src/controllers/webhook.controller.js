const logger = require('../utils/logger');
const config = require('../config/environment');
const queueService = require('../services/queue.service');
const commentAutomationService = require('../services/commentAutomation.service');

/**
 * Controlador de peticiones para los endpoints del Webhook de WhatsApp y Meta Graph
 */

/**
 * Maneja la verificación inicial del Webhook por parte de Meta (GET /webhook)
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.debug({
    msg: 'Petición de verificación del webhook recibida (GET)',
    query: req.query,
  });

  if (mode && token) {
    if (mode === 'subscribe' && token === config.VERIFY_TOKEN) {
      logger.info('¡Verificación del Webhook exitosa! Token verificado.');
      return res.status(200).send(challenge);
    } else {
      logger.warn({
        msg: 'Fallo en verificación del webhook: Tokens no coinciden.',
        tokenRecibido: token,
      });
      return res.status(403).json({ error: 'Token de verificación incorrecto' });
    }
  }

  logger.warn('Petición de verificación malformada.');
  return res.status(400).json({ error: 'Parámetros insuficientes' });
};

/**
 * Recibe los eventos de mensajería y comentarios en tiempo real de Meta (POST /webhook)
 */
exports.receiveMessage = async (req, res, next) => {
  try {
    const payload = req.body;

    logger.debug({
      msg: 'Carga útil del webhook recibida',
      payload,
    });

    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const field = change?.field;
    const value = change?.value;

    // A. Detectar Comentarios en Anuncios / Publicaciones de Facebook o Instagram (feed/comments)
    if (field === 'feed' || value?.item === 'comment') {
      logger.info({ msg: '💬 Webhook Meta Ads Feed/Comment detectado', field, item: value?.item });
      setImmediate(() => {
        commentAutomationService.handleIncomingComment(value).catch(err => {
          logger.error({ msg: 'Error procesando automatizacion de comentario en webhook controller', error: err.message });
        });
      });
      return res.status(200).send('EVENT_RECEIVED');
    }

    // B. Detectar Eventos de WhatsApp Business
    if (payload.object === 'whatsapp_business_account' || payload.object === 'page' || payload.object === 'instagram') {
      const entryId = entry?.id;
      const signature = req.headers['x-hub-signature-256'] || 'Sin firma';
      const firstMessage = change?.value?.messages?.[0];
      const messageId = firstMessage?.id || 'N/A';
      const fromPhone = firstMessage?.from || 'N/A';

      logger.info({
        msg: '🔍 [RASTREO META WEBHOOK] Evento POST Recibido de Meta',
        entryId,
        signature: signature.substring(0, 30) + '...',
        messageId,
        fromPhone,
        timestamp: new Date().toISOString()
      });

      // Encolamos de forma asíncrona para liberar inmediatamente el ciclo HTTP
      const job = await queueService.addJob('process-whatsapp-payload', payload);
      
      logger.debug({ msg: 'Mensaje encolado', jobId: job.id });

      // Retornar 200 OK inmediatamente (Meta exige respuesta rápida)
      return res.status(200).send('EVENT_RECEIVED');
    }

    // Si no coincide, responder 200 OK para evitar bloqueos de Meta Webhook verification
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    next(error);
  }
};

