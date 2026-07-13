const logger = require('../utils/logger');
const config = require('../config/environment');
const queueService = require('../services/queue.service');

/**
 * Controlador de peticiones para los endpoints del Webhook de WhatsApp
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
      // Importante: Responder con el challenge en texto plano
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
 * Recibe los eventos de mensajería en tiempo real de Meta (POST /webhook)
 */
exports.receiveMessage = async (req, res, next) => {
  try {
    const payload = req.body;

    logger.debug({
      msg: 'Carga útil del webhook recibida',
      payload,
    });

    // Validamos que el objeto sea el esperado de WhatsApp Business
    if (payload.object === 'whatsapp_business_account') {
      // Encolamos de forma asíncrona para liberar inmediatamente el ciclo HTTP
      const job = await queueService.addJob('process-whatsapp-payload', payload);
      
      logger.debug({ msg: 'Mensaje encolado', jobId: job.id });

      // Retornar 200 OK inmediatamente (Meta exige respuesta rápida)
      return res.status(200).send('EVENT_RECEIVED');
    }

    // Si no es un evento de whatsapp_business_account, se retorna 404
    logger.warn({
      msg: 'Carga útil recibida no válida (campo object no coincide)',
      object: payload.object,
    });
    return res.status(404).send();
  } catch (error) {
    next(error);
  }
};
