const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const aiService = require('../services/ai.service');
const messageService = require('../services/message.service');
const metaGraphService = require('../services/metaGraph.service');
const { processAndStoreImage } = require('../utils/imageProcessor');
const { TTLCache } = require('../utils/ttlCache');

// Caché de teléfonos de contactos para no consultar la API repetidamente (TTL 1 hora, max 1000 items)
const contactPhoneCache = new TTLCache(3600000, 1000);

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

      // Resolver y actualizar nombre real del contacto si figura como John Doe o Cliente en Chatwoot
      const contactId = payload.conversation?.contact_inbox?.contact_id || payload.conversation?.contact_id || payload.conversation?.meta?.sender?.id;
      const psid = payload.conversation?.meta?.sender?.additional_attributes?.psid || payload.conversation?.meta?.sender?.id;
      if (contactId && psid) {
        metaGraphService.resolveAndUpdateChatwootContact(contactId, psid).catch(err => {
          logger.debug({ msg: 'Aviso resolviendo contacto en background', error: err.message });
        });
      }

      if (messageType === 'incoming') {
        const channelType = payload.inbox?.channel_type;
        const hasPhoneNumber = !!from; // from se obtiene de getContactPhone(payload)
        const isWhatsAppOrApi = channelType === 'Channel::Whatsapp' || channelType === 'Channel::Api' || hasPhoneNumber;

        if (isWhatsAppOrApi) {
          logger.debug(`💬 Mensaje entrante de Chatwoot ignorado (ya procesado en origen WhatsApp/API): "${payload.content}"`);
        } else {
          logger.info(`💬 Mensaje entrante multicanal de Chatwoot (${channelType}) recibido: "${payload.content}"`);
          
          if (!conversationId) {
            logger.warn('Mensaje de Chatwoot no tiene conversation.id, omitiendo.');
            return res.status(200).json({ success: true });
          }

          const hasAttachments = payload.attachments && payload.attachments.length > 0;
          const mockMsg = {
            from: `chatwoot_conv_${conversationId}`,
            id: `cw_msg_${payload.id}`,
            type: hasAttachments ? 'image' : 'text',
          };

          if (mockMsg.type === 'text') {
            mockMsg.text = { body: payload.content || '' };
          } else {
            const att = payload.attachments[0];
            mockMsg.image = { id: att.data_url };
          }

          const mockVal = {
            contacts: [
              { profile: { name: profileName } }
            ]
          };

          // Procesar en background (asíncrono)
          setImmediate(async () => {
            try {
              await messageService.handleIncomingMessage(mockMsg, mockVal);
            } catch (err) {
              logger.error({ msg: 'Error al procesar mensaje multicanal en background', error: err.message });
            }
          });
        }
      } else if (messageType === 'outgoing') {
        // Ignorar si es una nota privada (las notas de atribución de Meta Ads se crean como privadas)
        const isPrivateNote = payload.private === true || 
                              payload.private === 'true' || 
                              payload.private === 1 || 
                              payload.private === '1' ||
                              payload.content_attributes?.is_private === true ||
                              payload.content_attributes?.is_private === 'true' ||
                              (payload.content && payload.content.includes('[META ADS REFERRAL]'));

        if (isPrivateNote) {
          logger.debug(`💬 Nota privada de Chatwoot ignorada en webhook: "${payload.content}"`);
          return res.status(200).json({ success: true });
        }

        // Si es un mensaje saliente, verificar de forma estricta por ID (Number o String) o por contenido pendiente
        const rawContent = (payload.content || '').trim();
        const firstAttachmentUrl = payload.attachments && payload.attachments.length > 0 ? payload.attachments[0].data_url : null;
        const attachmentFileName = firstAttachmentUrl ? firstAttachmentUrl.split('/').pop() : null;

        const isContentPending = (rawContent && messageService.pendingBotSentContent.has(rawContent)) ||
                                 (attachmentFileName && messageService.pendingBotSentContent.has(attachmentFileName));

        const isBotSent = messageService.botSentMessageIds.has(messageId) || 
                          messageService.botSentMessageIds.has(String(messageId)) || 
                          messageService.botSentMessageIds.has(Number(messageId)) ||
                          isContentPending;

        if (isBotSent) {
          logger.debug(`💬 Mensaje saliente de Chatwoot ignorado (generado por el bot): ID [${messageId}] / ContentPending: ${isContentPending}`);
          return res.status(200).json({ success: true });
        }

        // Fue un agente humano real desde la interfaz de Chatwoot, pausar bot
        const pauseKey = from || `chatwoot_conv_${conversationId}`;
        logger.info(`👤 Mensaje manual de agente humano detectado en Chatwoot para ${profileName} (${pauseKey}). Pausando bot.`);
        aiService.pauseConversation(pauseKey);

        // Solo reenviar a WhatsApp si el canal es de tipo API (nuestro canal de WhatsApp) y no es destinatario virtual
        const channelType = payload.inbox?.channel_type;
        const isApiChannel = channelType === 'Channel::Api';

        if (isApiChannel && from && !from.startsWith('chatwoot_conv_')) {
          if (payload.attachments && payload.attachments.length > 0) {
            const att = payload.attachments[0];
            if (att.data_url) {
              try {
                const publicImageUrl = await processAndStoreImage(att.data_url);
                await messageService.sendImageMessage(from, publicImageUrl, true);
              } catch (imgErr) {
                logger.error({ msg: 'Error procesando imagen saliente de Chatwoot, intentando URL directa', error: imgErr.message });
                await messageService.sendImageMessage(from, att.data_url, true);
              }
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
