const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const geminiService = require('./gemini.service');

// Inicializar Gemini al cargar el módulo
geminiService.initialize();

/**
 * Servicio encargado de procesar la lógica de negocio para los eventos de WhatsApp.
 */
class MessageService {
  constructor() {
    // Almacena los IDs de los mensajes enviados por el bot para distinguirlos de los manuales
    this.botSentMessageIds = new Set();
  }

  /**
   * Procesa la carga útil recibida de WhatsApp.
   * @param {Object} payload Carga útil del webhook en bruto de Meta.
   */
  async processPayload(payload) {
    try {
      if (!payload.entry || !Array.isArray(payload.entry)) {
        logger.warn('Carga útil recibida no tiene el formato entry esperado.');
        return;
      }

      for (const entry of payload.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          const value = change.value;
          if (!value) continue;

          // Caso 1: Es un mensaje entrante
          if (value.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              await this.handleIncomingMessage(message, value);
            }
          }

          // Caso 2: Es una actualización de estado de un mensaje enviado por nosotros
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const status of value.statuses) {
              await this.handleStatusUpdate(status);
            }
          }
        }
      }
    } catch (error) {
      logger.error({ msg: 'Error procesando la carga útil de WhatsApp', error: error.message });
      throw error;
    }
  }

  /**
   * Maneja un mensaje entrante.
   * @param {Object} message Objeto del mensaje individual.
   * @param {Object} value Cambios del webhook.
   */
  async handleIncomingMessage(message, value) {
    const from = message.from;
    const messageId = message.id;
    const messageType = message.type;
    const contact = value.contacts && value.contacts[0];
    const profileName = contact ? contact.profile.name : 'Desconocido';

    logger.info({
      msg: 'Nuevo mensaje recibido',
      from,
      profileName,
      messageId,
      messageType,
    });

    if (messageType === 'text') {
      const body = message.text.body;
      logger.info(`💬 Mensaje de texto de [${profileName}] (${from}): "${body}"`);
      
      // Generar respuesta con Gemini AI
      const aiResponse = await geminiService.generateResponse(from, profileName, body);
      if (aiResponse) {
        await this.sendTextMessage(from, aiResponse);
      }
    } else if (messageType === 'image' || messageType === 'audio' || messageType === 'video' || messageType === 'document') {
      logger.info(`📎 Mensaje de tipo "${messageType}" recibido de [${profileName}].`);
      if (!geminiService.isConversationPaused(from)) {
        await this.sendTextMessage(from, `¡Hola, ${profileName}! He recibido tu archivo. Por el momento solo puedo procesar mensajes de texto. Si necesitas ayuda, escríbeme tu consulta y con gusto te asisto. 😊`);
      }
    } else if (messageType === 'sticker') {
      logger.info(`🎉 Sticker recibido de [${profileName}].`);
      if (!geminiService.isConversationPaused(from)) {
        await this.sendTextMessage(from, `😄 ¡Bonito sticker, ${profileName}! ¿En qué puedo ayudarte hoy?`);
      }
    } else {
      logger.info(`📎 Mensaje de tipo "${messageType}" recibido (no procesado).`);
    }
  }

  /**
   * Envía un mensaje de texto de respuesta llamando a la API Graph de Meta.
   * @param {string} to Número de teléfono del destinatario.
   * @param {string} text Texto del mensaje a enviar.
   */
  async sendTextMessage(to, text) {
    if (!config.ACCESS_TOKEN || !config.PHONE_NUMBER_ID) {
      logger.warn('No se puede enviar respuesta automática: ACCESS_TOKEN o PHONE_NUMBER_ID no configurados.');
      return;
    }

    try {
      logger.debug({ msg: 'Enviando mensaje de WhatsApp a Meta', to, text });
      
      const response = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v25.0/${config.PHONE_NUMBER_ID}/messages`,
        headers: {
          'Authorization': `Bearer ${config.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        }
      });

      const sentMessageId = response.data.messages[0].id;
      // Guardar el ID para saber que este mensaje fue enviado por el bot
      this.botSentMessageIds.add(sentMessageId);

      logger.info({
        msg: 'Mensaje de respuesta automática enviado correctamente a Meta',
        recipient: to,
        messageId: sentMessageId
      });
    } catch (error) {
      const errorResponse = error.response ? error.response.data : error.message;
      logger.error({
        msg: 'Fallo al enviar el mensaje de respuesta automática a través de Meta',
        to,
        error: errorResponse
      });
    }
  }

  /**
   * Envía un mensaje de texto a una conversación de Chatwoot.
   * @param {string|number} conversationId ID de la conversación en Chatwoot.
   * @param {string} text Texto del mensaje.
   */
  async sendChatwootMessage(conversationId, text) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      logger.warn('No se puede enviar respuesta a Chatwoot: CHATWOOT_ACCESS_TOKEN o CHATWOOT_ACCOUNT_ID no configurados.');
      return;
    }

    try {
      logger.debug({ msg: 'Enviando mensaje a Chatwoot', conversationId, text });
      
      const response = await axios({
        method: 'POST',
        url: `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`,
        headers: {
          'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          content: text,
          message_type: 'outgoing',
          private: false
        }
      });

      const sentMessageId = response.data.id;
      // Guardar el ID para saber que este mensaje fue enviado por el bot
      this.botSentMessageIds.add(sentMessageId);

      logger.info({
        msg: 'Mensaje de respuesta del bot enviado a Chatwoot correctamente',
        conversationId,
        messageId: sentMessageId
      });
    } catch (error) {
      const errorResponse = error.response ? error.response.data : error.message;
      logger.error({
        msg: 'Fallo al enviar mensaje a Chatwoot',
        conversationId,
        error: errorResponse
      });
    }
  }


  /**
   * Maneja actualizaciones de estado de mensajes.
   * @param {Object} status Objeto del estado individual.
   */
  async handleStatusUpdate(status) {
    const messageId = status.id;
    const state = status.status; // sent, delivered, read, failed
    const recipient = status.recipient_id;

    logger.debug({
      msg: 'Actualización de estado de mensaje',
      messageId,
      state,
      recipient,
    });

    logger.info(`📈 Estado del mensaje [${messageId}] para [${recipient}]: ${state.toUpperCase()}`);
    
    // Si detectamos un estado 'sent' de un mensaje que NO fue enviado por el bot,
    // significa que un agente humano respondió desde el Meta Business Suite.
    if (state === 'sent') {
      if (this.botSentMessageIds.has(messageId)) {
        // Fue el bot, removemos el ID y no pausamos
        this.botSentMessageIds.delete(messageId);
      } else {
        // Fue un humano desde la bandeja de entrada, pausamos el bot por 2 horas
        logger.info(`👤 Mensaje manual de agente detectado hacia ${recipient}. Pausando bot.`);
        geminiService.pauseConversation(recipient);
      }
    }

    if (state === 'failed' && status.errors) {
      logger.error({
        msg: 'Error en envío de mensaje de WhatsApp',
        messageId,
        recipient,
        errors: status.errors,
      });
    }
  }
}

module.exports = new MessageService();
