const logger = require('../utils/logger');
const geminiService = require('../services/gemini.service');
const messageService = require('../services/message.service');

/**
 * Recibe y procesa los eventos de Webhook enviados por Chatwoot
 */
exports.receiveChatwootMessage = async (req, res, next) => {
  try {
    const payload = req.body;

    logger.debug({
      msg: 'Carga útil del webhook de Chatwoot recibida',
      event: payload.event,
      message_type: payload.message_type
    });

    if (payload.event === 'message_created') {
      const conversationId = payload.conversation.id;
      const messageType = payload.message_type;
      const messageId = payload.id;

      // Obtener el número de teléfono del contacto como identificador único
      const contact = payload.contact || payload.sender || (payload.conversation && payload.conversation.contact);
      const from = contact ? (contact.phone_number || contact.id.toString()) : 'unknown';
      const profileName = contact ? (contact.name || 'Cliente') : 'Cliente';


      if (messageType === 'incoming') {
        const body = payload.content;
        logger.info(`💬 Mensaje entrante de Chatwoot de [${profileName}] (${from}): "${body}"`);

        // Encolar asíncronamente para liberar rápido la respuesta HTTP
        setImmediate(async () => {
          try {
            // Verificar si el bot está pausado para esta conversación
            if (geminiService.isConversationPaused(from)) {
              logger.info(`⏸️ Conversación con ${profileName} (${from}) está pausada. Bot no responderá.`);
              return;
            }

            // Generar respuesta con Gemini AI
            let aiResponse = await geminiService.generateResponse(from, profileName, body);
            if (aiResponse) {
              // Extraer enlace de imagen si existe y limpiarlo de la respuesta de texto
              const regex = /📷\s*Imagen\s*(?:referencial)?:\s*https:\/\/whatsapp-webhook-bilg\.onrender\.com\/images\/([A-Za-z0-9_-]+\.[A-Za-z]+)/;
              const match = aiResponse.match(regex);
              let imageFileName = null;

              if (match) {
                imageFileName = match[1];
                // Quitar el texto del enlace para que se envíe como archivo adjunto nativo
                aiResponse = aiResponse.replace(/📷\s*Imagen\s*(?:referencial)?:\s*https:\/\/whatsapp-webhook-bilg\.onrender\.com\/images\/[A-Za-z0-9_-]+\.[A-Za-z]+/, '').trim();
              }

              await messageService.sendChatwootMessage(conversationId, aiResponse, imageFileName);
            }

          } catch (err) {
            logger.error({
              msg: 'Error procesando respuesta de Gemini para Chatwoot',
              error: err.message
            });
          }
        });

      } else if (messageType === 'outgoing') {
        // Si es un mensaje saliente, verificar si fue enviado por nuestro bot
        if (messageService.botSentMessageIds.has(messageId)) {
          // Fue el bot, removemos el ID y no pausamos
          messageService.botSentMessageIds.delete(messageId);
        } else {
          // Fue un humano desde la interfaz de Chatwoot, pausamos el bot por 2 horas
          logger.info(`👤 Mensaje manual de agente detectado en Chatwoot para ${profileName} (${from}). Pausando bot.`);
          geminiService.pauseConversation(from);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
