const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const geminiService = require('./gemini.service');
const catalogService = require('./catalog.service');


const { TTLCache, CappedSet } = require('../utils/ttlCache');

// Inicializar Gemini al cargar el módulo
geminiService.initialize();

/**
 * Servicio encargado de procesar la lógica de negocio para los eventos de WhatsApp.
 */
class MessageService {
  constructor() {
    // Almacena los IDs de los mensajes enviados por el bot con capacidad acotada (evita fugas)
    this.botSentMessageIds = new CappedSet(5000);
    // Almacena las sesiones activas de Typebot por número de teléfono con TTL de 24h
    this.userSessions = new TTLCache(24 * 3600 * 1000, 2000);
    // Almacena las últimas opciones interactivas presentadas de Typebot con TTL de 12h
    this.lastUserInputs = new TTLCache(12 * 3600 * 1000, 2000);
    // Cache para mapear números de teléfono a IDs de conversación de Chatwoot con TTL de 24h
    this.chatwootConversations = new TTLCache(24 * 3600 * 1000, 2000);
  }

  /**
   * Extrae el texto plano a partir de la estructura Slate richText de Typebot
   */
  extractText(content) {
    if (!content) return '';
    if (content.type === 'richText' && Array.isArray(content.richText)) {
      return content.richText.map(node => {
        if (node.children) {
          return node.children.map(child => child.text || '').join('');
        }
        return '';
      }).join('\n');
    }
    return content.text || '';
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
   * Envía una imagen de respuesta llamando a la API Graph de Meta.
   */
  async sendImageMessage(to, imageUrl, skipChatwootSync = false) {
    if (!config.ACCESS_TOKEN || !config.PHONE_NUMBER_ID) {
      logger.warn('No se puede enviar respuesta de imagen: ACCESS_TOKEN o PHONE_NUMBER_ID no configurados.');
      return;
    }

    try {
      logger.debug({ msg: 'Enviando imagen de WhatsApp a Meta', to, imageUrl });
      
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
          type: 'image',
          image: {
            link: imageUrl
          }
        }
      });

      const sentMessageId = response.data.messages[0].id;
      this.botSentMessageIds.add(sentMessageId);

      logger.info({
        msg: 'Imagen de respuesta automática enviada correctamente a Meta',
        recipient: to,
        messageId: sentMessageId
      });

      if (!skipChatwootSync) {
        await this.syncOutgoingMessageToChatwoot(to, `[Imagen enviada]: ${imageUrl}`);
      }
    } catch (error) {
      const errorResponse = error.response ? error.response.data : error.message;
      logger.error({
        msg: 'Fallo al enviar la imagen de respuesta automática a través de Meta',
        to,
        error: errorResponse
      });
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

    // Extraer texto o tipo para sincronizar
    let bodyText = '';
    if (messageType === 'text') {
      bodyText = message.text.body.trim();
    } else if (messageType === 'interactive') {
      const interactive = message.interactive;
      if (interactive.type === 'button_reply') {
        bodyText = interactive.button_reply.id;
      } else if (interactive.type === 'list_reply') {
        bodyText = interactive.list_reply.id;
      }
    }

    // Sincronizar mensaje entrante con Chatwoot antes de pausar o procesar
    const syncText = bodyText || (messageType === 'image' ? '[Imagen recibida]' : `[Mensaje tipo: ${messageType}]`);
    await this.syncIncomingMessageToChatwoot(from, profileName, syncText);

    // Si el bot está pausado para esta conversación (traspaso a humano)
    if (geminiService.isConversationPaused(from)) {
      logger.info(`⏸️ Conversación con ${profileName} (${from}) está pausada. Bot no responderá.`);
      return;
    }

    let body = '';
    if (messageType === 'text') {
      body = message.text.body.trim();
      logger.info(`💬 Mensaje de texto de [${profileName}] (${from}): "${body}"`);
    } else if (messageType === 'interactive') {
      const interactive = message.interactive;
      if (interactive.type === 'button_reply') {
        body = interactive.button_reply.id;
      } else if (interactive.type === 'list_reply') {
        body = interactive.list_reply.id;
      }
      logger.info(`🔘 Respuesta interactiva de [${profileName}] (${from}): "${body}"`);
    } else if (messageType === 'image') {
      logger.info(`📸 Recibida imagen de [${profileName}] (${from}) con ID: ${message.image.id}`);
      try {
        await this.sendTextMessage(from, "Un momento, por favor. Estoy analizando tu imagen para identificar el producto... 🔍");

        const { buffer, mimeType } = await this.downloadMetaMedia(message.image.id);
        const matchResult = await geminiService.identifyProductFromImage(buffer, mimeType);

        if (matchResult.matched && matchResult.code) {
          logger.info(`🎯 Producto identificado por imagen: ${matchResult.code}`);
          const searchResults = await catalogService.searchCatalog(matchResult.code);
          const product = searchResults[0];

          if (product) {
            const prices = product.precios_venta_sin_igv;
            const prefix = matchResult.isAlternative
              ? `No encontré ese modelo exacto en catálogo, pero encontré la opción más similar disponible:`
              : `¡Excelente! He identificado el producto de tu foto:`;

            const quoteMessage = `${prefix}\n\n` +
              `📦 *${product.nombre}*\n` +
              `🔢 Código: *${product.codigo}*\n` +
              `🎨 Color: ${product.color || 'Varios'}\n` +
              `📂 Categoría: ${product.categoria}\n\n` +
              `💰 *Precios unitarios estimados (sin IGV):*\n` +
              `• 1-5 unidades: *${prices.precio_1_5_unidades}*\n` +
              `• 6-12 unidades: *${prices.precio_6_12_unidades}*\n` +
              `• 13-50 unidades: *${prices.precio_13_50_unidades}*\n` +
              `• 51-499 unidades: *${prices.precio_51_499_unidades}*\n` +
              `• 500+ unidades: *${prices.precio_500_1000_unidades}*\n\n` +
              `¿Qué te gustaría hacer ahora?`;

            await this.sendTextMessage(from, quoteMessage);

            const options = [
              { id: 'block-choice-loopmenu-item-cotizar', content: '📦 Cotizar otro producto' },
              { id: 'block-choice-loopmenu-item-asesor', content: '👩‍💼 Hablar con asesor' }
            ];
            await this.sendInteractive(from, 'Selecciona una opción:', options);
            return;
          }
        }
        
        // No pausar el bot — invitar al usuario a describir el producto con texto
        await this.sendTextMessage(from, "No logré identificar ese producto exactamente desde la imagen 🔍. ¿Podrías describirme qué artículo es? Por ejemplo: *\"taza de cerámica 11oz\"* o *\"bolsa ecológica con cierre\"*. Así puedo buscarlo en nuestro catálogo y darte precios al instante. 😊");
        return;

      } catch (error) {
        logger.error({ msg: 'Error procesando imagen entrante', error: error.message });
        // No pausar el bot en caso de error técnico — mantener la conversación activa
        await this.sendTextMessage(from, "Tuve un problema técnico al procesar tu imagen 😅. ¿Puedes describirme el producto que buscas? Puedo ayudarte con precios y disponibilidad. 😊");
        return;
      }
    }

    if (body) {
      const cleanBody = body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      // 1. Detectar solicitud explícita de atención humana (Handover a Chatwoot)
      const agentKeywords = ['agente', 'asesor', 'humano', 'persona', 'hablar con asesor', 'hablar con alguien', 'atencion humana', 'atención humana', 'hablar con un asesor', 'vendedor'];
      const isAgentIntent = agentKeywords.some(keyword => cleanBody.includes(keyword));

      if (isAgentIntent) {
        logger.info(`👤 Solicitud de atención humana detectada de [${profileName}] (${from}). Pausando bot y transfiriendo a Chatwoot.`);
        geminiService.pauseConversation(from);
        await this.sendTextMessage(from, `¡Claro que sí, ${profileName}! 👩‍💼 He notificado a nuestros asesores comerciales. Un miembro de nuestro equipo tomará tu conversación por aquí en breve. Por favor aguarda unos momentos. 😊`);
        return;
      }

      const isResetKeyword = ['reiniciar', 'inicio', 'hola', 'buenas tardes', 'buenos dias', 'menú', 'menu'].includes(cleanBody);

      // Clasificación de intenciones basada en palabras clave de catálogo
      const catalogKeywords = [
        'precio', 'costo', 'cotizar', 'cotizacion', 'cotización', 'catalogo', 'catálogo',
        'taza', 'mug', 'termo', 'tomatodo', 'botella', 'llavero', 'destapador', 'lapicero',
        'bolsa', 'cambrell', 'notex', 'corcho', 'ecologico', 'libreta', 'agenda', 'lapiceros',
        'cuánto', 'cuanto', 'cuesta', 'valor', 'stock', 'cantidad', 'colores', 'color', 'muestra'
      ];
      
      const isCatalogIntent = !isResetKeyword && catalogKeywords.some(keyword => cleanBody.includes(keyword));

      // Si es una consulta de catálogo, desviamos directamente al motor Gemini para responderla
      if (isCatalogIntent) {
        logger.info(`🎯 Intención de catálogo detectada en mensaje libre de [${profileName}] (${from}): "${body}"`);
        try {
          const aiResponse = await geminiService.generateResponse(from, profileName, body);
          if (aiResponse) {
            await this.sendTextMessage(from, aiResponse);
          }
          
          // Re-presentar opciones del último bloque de Typebot para evitar la desconexión del flujo
          const lastInput = this.lastUserInputs.get(from);
          if (lastInput && lastInput.type === 'choice input' && lastInput.items && lastInput.items.length > 0) {
            await this.sendInteractive(from, "Por favor, selecciona una de las opciones para continuar con tu cotización:", lastInput.items);
          }
          return; // Finalizar procesamiento de mensaje aquí
        } catch (err) {
          logger.error({ msg: 'Error procesando intención de catálogo directa', error: err.message });
        }
      }

      try {
        let sessionId = this.userSessions.get(from);
        let response;

        const typebotUrl = process.env.TYPEBOT_API_URL || 'http://typebot-viewer:3000';
        if (!sessionId || isResetKeyword) {
          logger.info(`🔄 Iniciando nueva sesión de Typebot para ${profileName} (${from}) con variables predefinidas`);
          response = await axios.post(`${typebotUrl}/api/v1/typebots/jgis-publicidad-bot-f33vo50/startChat`, {
            prefilledVariables: {
              phone: from
            }
          });
          sessionId = response.data.sessionId;
          this.userSessions.set(from, sessionId);
          
          if (isResetKeyword) {
            // Mandamos los mensajes iniciales del startChat
            if (response && response.data) {
              await this.processTypebotMessages(from, response.data.messages || [], response.data.input);
            }
            return;
          }
        }

        logger.info(`💬 Continuando sesión de Typebot ${sessionId} para ${from}`);
        response = await axios.post(`${typebotUrl}/api/v1/sessions/${sessionId}/continueChat`, {
          message: { type: 'text', text: body }
        });

        if (response && response.data) {
          const messages = response.data.messages || [];
          const input = response.data.input;

          // Detectar error de validación de Typebot (ej. 'Invalid message. Please, try again.')
          let hasValidationError = false;
          for (const msg of messages) {
            if (msg.type === 'text') {
              const text = this.extractText(msg.content);
              if (text.toLowerCase().includes('invalid message') || 
                  text.toLowerCase().includes('try again') || 
                  text.toLowerCase().includes('inválido') || 
                  text.toLowerCase().includes('intenta de nuevo')) {
                hasValidationError = true;
                break;
              }
            }
          }

          if (hasValidationError) {
            logger.info(`⚠️ Error de validación detectado en Typebot para ${profileName} (${from}). Redirigiendo a Gemini.`);
            // Obtener respuesta contextual de Gemini para responder a la pregunta libre del cliente
            const aiResponse = await geminiService.generateResponse(from, profileName, body);
            if (aiResponse) {
              await this.sendTextMessage(from, aiResponse);
            } else {
              await this.sendTextMessage(from, "Lo siento, no comprendí esa opción.");
            }
            // Re-renderizar las opciones para que el cliente continúe con el flujo estructurado
            if (input && input.type === 'choice input' && input.items && input.items.length > 0) {
              await this.sendInteractive(from, "Por favor, selecciona una de las opciones para continuar con tu cotización:", input.items);
            }
          } else {
            // Flujo normal sin errores de validación
            await this.processTypebotMessages(from, messages, input);
          }
        }

      } catch (err) {
        logger.error({ msg: 'Error en Typebot Gateway Proxy, cayendo en fallback de Gemini', error: err.message });
        
        // Generar respuesta de respaldo con Gemini AI
        const aiResponse = await geminiService.generateResponse(from, profileName, body);
        if (aiResponse) {
          await this.sendTextMessage(from, aiResponse);
        }
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
   * Helper para iterar y despachar mensajes devueltos por la sesión de Typebot, combinando prompts con inputs interactivos
   */
  async processTypebotMessages(to, messages, input) {
    if (input) {
      this.lastUserInputs.set(to, input);
    }
    const mutableMessages = [...messages];
    
    // Si tenemos un input de selección (opciones) y el último mensaje es texto, combinarlos en un mensaje interactivo de WhatsApp
    let interactiveInputSent = false;
    if (input && input.type === 'choice input' && input.items && input.items.length > 0) {
      // Buscar el último mensaje de tipo texto
      let lastTextMsgIdx = -1;
      for (let i = mutableMessages.length - 1; i >= 0; i--) {
        if (mutableMessages[i].type === 'text') {
          lastTextMsgIdx = i;
          break;
        }
      }

      if (lastTextMsgIdx !== -1) {
        const lastMsg = mutableMessages[lastTextMsgIdx];
        const promptText = this.extractText(lastMsg.content);
        
        // Eliminar el mensaje de la lista mutable
        mutableMessages.splice(lastTextMsgIdx, 1);
        
        // Procesar los demás mensajes primero
        await this.sendRemainingMessages(to, mutableMessages);
        
        // Enviar el mensaje interactivo con las opciones
        await this.sendInteractive(to, promptText || 'Selecciona una opción:', input.items);
        interactiveInputSent = true;
      }
    }

    if (!interactiveInputSent) {
      await this.sendRemainingMessages(to, mutableMessages);
      if (input && input.type === 'choice input' && input.items && input.items.length > 0) {
        await this.sendInteractive(to, 'Selecciona una opción:', input.items);
      }
    }
  }

  async sendRemainingMessages(to, messages) {
    for (const msg of messages) {
      if (msg.type === 'text') {
        const text = this.extractText(msg.content);
        if (text.trim()) {
          await this.sendTextMessage(to, text);
        }
      } else if (msg.type === 'image') {
        let imgUrl = msg.content.url;
        if (imgUrl) {
          if (imgUrl.includes('localhost:3000') && process.env.PUBLIC_URL) {
            imgUrl = imgUrl.replace('http://localhost:3000', process.env.PUBLIC_URL);
          } else if (imgUrl.includes('host.docker.internal:3000') && process.env.PUBLIC_URL) {
            imgUrl = imgUrl.replace('http://host.docker.internal:3000', process.env.PUBLIC_URL);
          }
          await this.sendImageMessage(to, imgUrl);
        }
      }
    }
  }

  /**
   * Envía un mensaje de texto de respuesta llamando a la API Graph de Meta.
   * @param {string} to Número de teléfono del destinatario.
   * @param {string} text Texto del mensaje a enviar.
   */
  async sendTextMessage(to, text, skipChatwootSync = false) {
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

      if (!skipChatwootSync) {
        await this.syncOutgoingMessageToChatwoot(to, text);
      }
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
   * Envía un menú o botones interactivos llamando a la API Graph de Meta.
   * @param {string} to Número del destinatario.
   * @param {string} text Texto del cuerpo del mensaje.
   * @param {Array} items Lista de opciones para convertir en botones o filas.
   */
  async sendInteractive(to, text, items, skipChatwootSync = false) {
    if (!config.ACCESS_TOKEN || !config.PHONE_NUMBER_ID) {
      logger.warn('No se puede enviar interactivo: ACCESS_TOKEN o PHONE_NUMBER_ID no configurados.');
      return;
    }

    const cleanItems = items.map(item => {
      const content = typeof item === 'string' ? item : item.content;
      return {
        id: content.substring(0, 200), // Max 200 chars id
        title: content.substring(0, 24).trim() // Max 24 chars title for List, 20 for Button
      };
    });

    try {
      let data;
      // Si hay de 1 a 3 opciones, usar botones de respuesta rápida (quick reply)
      if (cleanItems.length > 0 && cleanItems.length <= 3) {
        logger.debug({ msg: 'Enviando botones interactivos de WhatsApp', to, text, cleanItems });
        data = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: text },
            action: {
              buttons: cleanItems.map(item => ({
                type: 'reply',
                reply: { id: item.id, title: item.title.substring(0, 20) } // Max 20 chars for buttons
              }))
            }
          }
        };
      } else if (cleanItems.length > 3) {
        // Si hay más de 3 opciones, usar un menú de lista (list menu)
        logger.debug({ msg: 'Enviando lista interactiva de WhatsApp', to, text, cleanItems });
        data = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: text },
            action: {
              button: 'Ver opciones',
              sections: [
                {
                  title: 'Opciones',
                  rows: cleanItems.map(item => ({
                    id: item.id,
                    title: item.title
                  }))
                }
              ]
            }
          }
        };
      }

      if (data) {
        const response = await axios({
          method: 'POST',
          url: `https://graph.facebook.com/v25.0/${config.PHONE_NUMBER_ID}/messages`,
          headers: {
            'Authorization': `Bearer ${config.ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          data
        });
        const sentMessageId = response.data.messages[0].id;
        this.botSentMessageIds.add(sentMessageId);
        logger.info({ msg: 'Mensaje interactivo enviado correctamente', recipient: to, messageId: sentMessageId });

        if (!skipChatwootSync) {
          const optionsText = cleanItems.map(i => `- ${i.title}`).join('\n');
          await this.syncOutgoingMessageToChatwoot(to, `${text}\n\nOpciones:\n${optionsText}`);
        }
      }
    } catch (error) {
      const errorResponse = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Fallo al enviar mensaje interactivo a través de Meta', to, error: errorResponse });
    }
  }

  /**
   * Envía un mensaje a una conversación de Chatwoot, con soporte opcional para imagen adjunta.
   * @param {string|number} conversationId ID de la conversación en Chatwoot.
   * @param {string} text Texto del mensaje.
   * @param {string} [imageFileName] Nombre del archivo de imagen adjunto.
   */
  async sendChatwootMessage(conversationId, text, imageFileName) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      logger.warn('No se puede enviar respuesta a Chatwoot: CHATWOOT_ACCESS_TOKEN o CHATWOOT_ACCOUNT_ID no configurados.');
      return;
    }

    try {
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
      let response;

      if (imageFileName) {
        const imagePath = path.join(__dirname, '..', 'public', 'images', imageFileName);
        if (fs.existsSync(imagePath)) {
          logger.debug({ msg: 'Enviando mensaje con imagen adjunta a Chatwoot', conversationId, imageFileName });
          const formData = new FormData();
          formData.append('content', text);
          formData.append('message_type', 'outgoing');
          formData.append('private', 'false');

          const fileBuffer = fs.readFileSync(imagePath);
          const ext = path.extname(imageFileName).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
          
          const blob = new Blob([fileBuffer], { type: mimeType });
          formData.append('attachments[]', blob, imageFileName);

          response = await axios.post(url, formData, {
            headers: {
              'api_access_token': config.CHATWOOT_ACCESS_TOKEN
            }
          });
        } else {
          logger.warn({ msg: 'El archivo de imagen no existe localmente', imagePath });
        }
      }

      if (!response) {
        logger.debug({ msg: 'Enviando mensaje de texto simple a Chatwoot', conversationId, text });
        response = await axios({
          method: 'POST',
          url,
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
      }

      const sentMessageId = response.data.id;
      // Guardar el ID para saber que este mensaje fue enviado por el bot
      this.botSentMessageIds.add(sentMessageId);

      logger.info({
        msg: 'Mensaje de respuesta del bot enviado a Chatwoot correctamente',
        conversationId,
        messageId: sentMessageId,
        hasImage: !!imageFileName
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

  /**
   * Descarga un archivo multimedia desde la API de Meta Graph.
   * @param {string} mediaId ID del recurso multimedia.
   * @returns {Object} { buffer: Buffer, mimeType: string }
   */
  async downloadMetaMedia(mediaId) {
    if (!config.ACCESS_TOKEN) {
      throw new Error('ACCESS_TOKEN no configurado para descarga de multimedia.');
    }

    try {
      logger.debug({ msg: 'Consultando metadatos de multimedia en Meta', mediaId });
      // 1. Obtener la URL de descarga binaria
      const metadataResponse = await axios({
        method: 'GET',
        url: `https://graph.facebook.com/v25.0/${mediaId}`,
        headers: {
          'Authorization': `Bearer ${config.ACCESS_TOKEN}`
        }
      });

      const downloadUrl = metadataResponse.data.url;
      const mimeType = metadataResponse.data.mime_type;
      
      if (!downloadUrl) {
        throw new Error('No se encontró URL de descarga en los metadatos de Meta Graph.');
      }

      logger.debug({ msg: 'Descargando binario de multimedia de Meta', downloadUrl, mimeType });
      // 2. Descargar los bytes de la imagen
      const mediaResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        headers: {
          'Authorization': `Bearer ${config.ACCESS_TOKEN}`
        },
        responseType: 'arraybuffer'
      });

      return {
        buffer: Buffer.from(mediaResponse.data),
        mimeType
      };
    } catch (error) {
      const errorResponse = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Error al descargar archivo de Meta Graph API', mediaId, error: errorResponse });
      throw error;
    }
  }

  /**
   * Sincroniza un mensaje entrante de WhatsApp en Chatwoot.
   */
  async syncIncomingMessageToChatwoot(phone, name, text) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      logger.warn('No se puede sincronizar a Chatwoot: token o ID de cuenta no configurado.');
      return;
    }
    try {
      const conversationId = await this.getOrCreateConversationId(phone, name);
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
      
      const response = await axios({
        method: 'POST',
        url,
        headers: {
          'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          content: text || '[Mensaje sin texto]',
          message_type: 'incoming',
          private: false
        }
      });
      logger.info({ msg: 'Mensaje entrante de WhatsApp sincronizado con Chatwoot', conversationId, messageId: response.data.id });
    } catch (error) {
      const errRes = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Error al sincronizar mensaje entrante con Chatwoot', phone, error: errRes });
    }
  }

  /**
   * Sincroniza un mensaje saliente enviado por el bot hacia Chatwoot.
   */
  async syncOutgoingMessageToChatwoot(phone, text, imageFileName) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      return;
    }
    try {
      const conversationId = await this.getOrCreateConversationId(phone);
      await this.sendChatwootMessage(conversationId, text, imageFileName);
    } catch (error) {
      logger.error({ msg: 'Error al sincronizar mensaje saliente con Chatwoot', phone, error: error.message });
    }
  }

  /**
   * Obtiene o crea una conversación en Chatwoot para un número telefónico.
   */
  async getOrCreateConversationId(phone, name) {
    if (this.chatwootConversations.has(phone)) {
      return this.chatwootConversations.get(phone);
    }

    const accountId = config.CHATWOOT_ACCOUNT_ID;
    const userToken = config.CHATWOOT_ACCESS_TOKEN;
    const inboxId = parseInt(process.env.CHATWOOT_INBOX_ID || '1');
    const headers = {
      'api_access_token': userToken,
      'Content-Type': 'application/json'
    };

    // Formatear teléfono con + si no lo tiene
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    let contactId;
    // 1. Buscar contacto
    try {
      const searchRes = await axios.get(
        `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/search?q=${formattedPhone}`,
        { headers }
      );
      const contacts = searchRes.data.payload || [];
      if (contacts.length > 0) {
        contactId = contacts[0].id;
      }
    } catch (err) {
      logger.error({ msg: 'Error buscando contacto en Chatwoot', phone: formattedPhone, error: err.message });
    }

    // 2. Crear contacto si no existe
    if (!contactId) {
      try {
        const createContactRes = await axios.post(
          `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts`,
          {
            inbox_id: inboxId,
            name: name || 'Cliente WhatsApp',
            phone_number: formattedPhone
          },
          { headers }
        );
        contactId = createContactRes.data.payload.contact.id;
        logger.info({ msg: 'Contacto creado en Chatwoot', contactId, phone: formattedPhone });
      } catch (err) {
        logger.error({ msg: 'Error creando contacto en Chatwoot', error: err.response ? err.response.data : err.message });
        throw err;
      }
    }

    // 3. Buscar conversación activa
    let conversationId;
    try {
      const conversationsRes = await axios.get(
        `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
        { headers }
      );
      const conversations = conversationsRes.data.payload || [];
      const activeConv = conversations.find(c => c.status === 'open' || c.status === 'snoozed');
      if (activeConv) {
        conversationId = activeConv.id;
      }
    } catch (err) {
      logger.error({ msg: 'Error buscando conversación activa en Chatwoot', contactId, error: err.message });
    }

    // 4. Crear conversación si no existe
    if (!conversationId) {
      try {
        const createConvRes = await axios.post(
          `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/conversations`,
          {
            inbox_id: inboxId,
            contact_id: contactId
          },
          { headers }
        );
        conversationId = createConvRes.data.id;
        logger.info({ msg: 'Conversación creada en Chatwoot', conversationId, contactId });
      } catch (err) {
        logger.error({ msg: 'Error creando conversación en Chatwoot', error: err.response ? err.response.data : err.message });
        throw err;
      }
    }

    this.chatwootConversations.set(phone, conversationId);
    return conversationId;
  }
}

module.exports = new MessageService();
