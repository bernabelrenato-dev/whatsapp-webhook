const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const geminiService = require('../services/gemini.service');
const messageService = require('../services/message.service');

// Caché de teléfonos de contactos para no consultar la API repetidamente
const contactPhoneCache = new Map();

/**
 * Normaliza un número de teléfono al formato que espera Meta (sin + ni espacios).
 * @param {string} phone Número con posible prefijo + o espacios.
 * @returns {string|null} Número limpio, e.g. "51936473437"
 */
function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Obtiene el número de teléfono del cliente del payload o consulta la API de Chatwoot si no viene en el evento.
 * @param {object} payload Payload del webhook de Chatwoot.
 * @returns {Promise<{ phone: string|null, name: string }>} 
 */
async function getContactPhone(payload) {
  // Prioridad 1: conversation.meta.sender
  const metaSender = payload.conversation?.meta?.sender;
  if (metaSender?.phone_number) {
    return {
      phone: normalizePhone(metaSender.phone_number),
      name: metaSender.name || 'Cliente'
    };
  }

  // Prioridad 2: conversation.contact
  const convContact = payload.conversation?.contact;
  if (convContact?.phone_number) {
    return {
      phone: normalizePhone(convContact.phone_number),
      name: convContact.name || 'Cliente'
    };
  }

  // Prioridad 3: payload.contact
  const directContact = payload.contact;
  if (directContact?.phone_number) {
    return {
      phone: normalizePhone(directContact.phone_number),
      name: directContact.name || 'Cliente'
    };
  }

  // Prioridad 4: Fallback directo a la API de Chatwoot usando el contact_id
  const contactId = metaSender?.id || payload.conversation?.contact_inbox?.contact_id || payload.conversation?.contact_id;
  if (contactId) {
    if (contactPhoneCache.has(contactId)) {
      return contactPhoneCache.get(contactId);
    }

    try {
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts/${contactId}`;
      const res = await axios.get(url, {
        headers: { 'api_access_token': config.CHATWOOT_ACCESS_TOKEN }
      });
      const c = res.data?.payload;
      if (c && c.phone_number) {
        const result = {
          phone: normalizePhone(c.phone_number),
          name: c.name || 'Cliente'
        };
        contactPhoneCache.set(contactId, result);
        logger.info({ msg: 'Teléfono de contacto obtenido exitosamente de la API de Chatwoot', contactId, phone: result.phone });
        return result;
      }
    } catch (err) {
      logger.error({ msg: 'Error consultando contacto en API de Chatwoot', contactId, error: err.message });
    }
  }

  return { phone: null, name: 'Cliente' };
}

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
      const conversationId = payload.conversation ? payload.conversation.id : null;
      const messageType = payload.message_type;
      const messageId = payload.id;

      const { phone: from, name: profileName } = await getContactPhone(payload);

      if (messageType === 'incoming') {
        logger.debug(`💬 Mensaje entrante de Chatwoot ignorado (ya procesado en origen): "${payload.content}"`);
      } else if (messageType === 'outgoing') {
        // Si es un mensaje saliente, verificar si fue enviado por nuestro bot
        if (messageService.botSentMessageIds.has(messageId)) {
          // Fue el bot, removemos el ID y no pausamos
          messageService.botSentMessageIds.delete(messageId);
        } else {
          if (!from) {
            logger.error({ msg: '❌ No se pudo extraer ni consultar el número de teléfono del contacto', conversationId });
            return res.status(200).json({ success: true });
          }

          // Fue un humano desde la interfaz de Chatwoot, pausamos el bot por 2 horas
          logger.info(`👤 Mensaje manual de agente detectado en Chatwoot para ${profileName} (${from}). Pausando bot.`);
          geminiService.pauseConversation(from);

          // Reenviar al celular del usuario en WhatsApp (sin sincronizar de vuelta a Chatwoot)
          if (payload.attachments && payload.attachments.length > 0) {
            const att = payload.attachments[0];
            if (att.data_url) {
              await messageService.sendImageMessage(from, att.data_url, true);
            }
          } else if (payload.content) {
            await messageService.sendTextMessage(from, payload.content, true);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

