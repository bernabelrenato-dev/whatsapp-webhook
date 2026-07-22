const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');
const aiService = require('./ai.service');
const catalogService = require('./catalog.service');
const { processAndStoreImage } = require('../utils/imageProcessor');


const { TTLCache, CappedSet } = require('../utils/ttlCache');

// Inicializar IA al cargar el módulo
aiService.initialize();

/**
 * Servicio encargado de procesar la lógica de negocio para los eventos de WhatsApp.
 */
class MessageService {
  constructor() {
    // Almacena los IDs de los mensajes enviados por el bot con capacidad acotada (evita fugas)
    this.botSentMessageIds = new CappedSet(5000);
    // Caché de contenido de mensajes salientes pendientes (TTL 60s) para evitar race conditions con webhooks de Chatwoot
    this.pendingBotSentContent = new TTLCache(60000, 2000);
    // Cache de IDs de mensajes procesados para deduplicación global entre múltiples Apps de Meta
    this.processedMessageIds = new CappedSet(5000);
    // Almacena las sesiones activas de Typebot por número de teléfono con TTL de 24h
    this.userSessions = new TTLCache(24 * 3600 * 1000, 2000);
    // Almacena las últimas opciones interactivas presentadas de Typebot con TTL de 12h
    this.lastUserInputs = new TTLCache(12 * 3600 * 1000, 2000);
    // Cache para mapear números de teléfono a IDs de conversación de Chatwoot con TTL de 24h
    this.chatwootConversations = new TTLCache(24 * 3600 * 1000, 2000);
    // Cola de espera/pausa (debounce) para agrupar mensajes por cliente
    this.debounceQueues = new Map();
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
    if (typeof to === 'string' && to.startsWith('chatwoot_conv_')) {
      const conversationId = to.replace('chatwoot_conv_', '');
      let imageFileName;
      try {
        imageFileName = path.basename(new URL(imageUrl).pathname);
      } catch (e) {
        imageFileName = 'product_image.jpg';
      }
      await this.sendChatwootMessage(conversationId, `[Imagen]: ${imageUrl}`, imageFileName);
      return;
    }

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
        let imageFileName;
        try {
          imageFileName = path.basename(new URL(imageUrl).pathname);
        } catch (e) {
          imageFileName = 'product_image.jpg';
        }
        await this.syncOutgoingMessageToChatwoot(to, null, imageFileName);
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

    // Deduplicación Global por Message ID (Evita procesar webhooks duplicados de 2 apps de Meta o reintentos)
    if (messageId) {
      if (this.processedMessageIds.has(messageId)) {
        logger.info({ msg: 'Mensaje duplicado omitido por ID de mensaje de Meta', messageId, from });
        return;
      }
      this.processedMessageIds.add(messageId);
    }

    // 1. Get or create queue for user
    if (!this.debounceQueues) {
      this.debounceQueues = new Map();
    }

    let userQueue = this.debounceQueues.get(from);
    if (!userQueue) {
      userQueue = {
        timer: null,
        messages: [],
        profileName: profileName,
        value: value
      };
      this.debounceQueues.set(from, userQueue);
    }

    // 2. Add message to queue
    userQueue.messages.push(message);

    // 3. Reset/Set debounce timer (8 seconds)
    if (userQueue.timer) {
      clearTimeout(userQueue.timer);
    }

    userQueue.timer = setTimeout(async () => {
      const messagesToProcess = userQueue.messages;
      this.debounceQueues.delete(from); // Clear queue from map
      
      try {
        await this.processCombinedMessages(from, userQueue.profileName, messagesToProcess, userQueue.value);
      } catch (err) {
        logger.error({ msg: 'Error processing combined messages', from, error: err.message, stack: err.stack });
      }
    }, 8000); // 8 seconds debounce
  }

  /**
   * Procesa la lista de mensajes agrupados después de la pausa (debouncing)
   */
  async processCombinedMessages(from, profileName, messages, value) {
    // 1. Separar mensajes de texto e imágenes, y detectar meta referrals
    const texts = [];
    const images = [];
    let referral = null;
    
    for (const msg of messages) {
      if (msg.referral) {
        referral = msg.referral;
      }
      if (msg.type === 'text') {
        texts.push(msg.text.body.trim());
      } else if (msg.type === 'interactive') {
        const interactive = msg.interactive;
        if (interactive.type === 'button_reply') {
          texts.push(interactive.button_reply.id);
        } else if (interactive.type === 'list_reply') {
          texts.push(interactive.list_reply.id);
        }
      } else if (msg.type === 'image') {
        images.push(msg.image);
      }
    }

    const combinedText = texts.join('\n').trim();
    const hasImage = images.length > 0;

    const isChatwootConv = typeof from === 'string' && from.startsWith('chatwoot_conv_');

    // 2. Sincronizar mensaje entrante con Chatwoot SOLO si proviene de WhatsApp nativo (no duplicar en conversaciones de Chatwoot)
    let uploadedImageUrl = null;
    if (!isChatwootConv) {
      if (hasImage) {
        const img = images[images.length - 1]; // procesar última imagen
        try {
          const { buffer, mimeType } = await this.downloadMetaMedia(img.id);
          
          let ext = '.jpg';
          if (mimeType === 'image/png') ext = '.png';
          else if (mimeType === 'image/gif') ext = '.gif';
          const fileName = 'whatsapp_image_' + Date.now() + ext;

          // Guardar imagen en directorio estático público para que Typebot pueda consumirla
          const publicImagesDir = path.join(__dirname, '..', 'public', 'images');
          if (!fs.existsSync(publicImagesDir)) {
            fs.mkdirSync(publicImagesDir, { recursive: true });
          }
          const filePath = path.join(publicImagesDir, fileName);
          fs.writeFileSync(filePath, buffer);
          
          const baseUrl = process.env.PUBLIC_URL || 'https://bot.jgispublicidad.pe';
          uploadedImageUrl = `${baseUrl}/images/${fileName}`;

          const syncText = combinedText || '[Imagen recibida]';
          await this.syncIncomingMessageToChatwoot(from, profileName, syncText, buffer, fileName, mimeType);
        } catch (err) {
          logger.error({ msg: 'Error al descargar/sincronizar imagen a Chatwoot/Disco', error: err.message });
          await this.syncIncomingMessageToChatwoot(from, profileName, combinedText || '[Imagen recibida]');
        }
      } else if (combinedText) {
        await this.syncIncomingMessageToChatwoot(from, profileName, combinedText);
      }
    }

    // Mensajes oficiales del flujo comercial Renato Bernabel
    const renatoGreetingSpeech = `👋 ¡Hola! Muchas gracias por comunicarte con *Corporación JGIS Publicidad*.

Mi nombre es *Renato Bernabel*, *Asesor Comercial*, y con gusto te ayudaré a encontrar la mejor opción para tu proyecto.

Trabajamos con productos personalizados y merchandising, como polos, gorras, tazas, artículos promocionales y mucho más, tanto para empresas como para pedidos personales.`;

    // Plantilla comercial oficial de pago y entrega de gorras JGIS
    const capCampaignTemplate = `📦 ¡Gracias por tu interés en nuestras gorras! 🧢

💰 Costo: S/. 15 por unidad

🚚 Método de entrega:
　✅ Envíos a todo el Perú
　🏬 Recojo en tienda

⏱️ Tiempo de entrega (producción): 48 horas

💳 Datos de Pago
🏦 Banco: BCP
💳 Cuenta Corriente (Soles): 1912434894087
🔢 CCI: 00219100243489408755
📱 Yape / Plin: 969732451
👤 Titular: Corporación JGIS

📍 Dirección
🏢 Galería Centro Comercial Centro Lima
🔻 Sótano – Pasaje "H", Stand 560
🚪 Referencia: cerca de la Puerta 7 (Boulevard)

¿Cuántas unidades te gustaría llevar? 😊`;

    // 1. Evaluar si el referral o mensaje corresponde a la campaña o producto de gorras
    const referralText = [
      referral?.headline,
      referral?.body,
      referral?.source_url,
      referral?.ad_id,
      referral?.source_id,
      combinedText
    ].filter(Boolean).join(' ').toLowerCase();

    // (Ruteo 100% Typebot: Interceptor hardcoded de Campaña de Gorras desactivado para respetar el flujo configurado en Typebot)


    // 3. Si el bot está pausado para esta conversación en WhatsApp, verificar si podemos despausarlo
    const cleanBody = (combinedText || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isResetKeyword = ['reiniciar', 'inicio', 'hola', 'buenas tardes', 'buenos dias', 'menu', 'reset'].includes(cleanBody);

    if (aiService.isConversationPaused(from)) {
      const pauseDetails = aiService.getPauseDetails(from);
      let shouldUnpause = false;

      // Condición A: El cliente envió una palabra clave de reinicio explícita (siempre despausa)
      if (isResetKeyword) {
        logger.info(`🔄 Palabra clave de reinicio detectada de [${profileName}] (${from}) mientras el bot estaba pausado. Despausando bot.`);
        shouldUnpause = true;
      }
      // Condición B: La pausa fue por solicitud del cliente/fallback ('user') Y pasaron más de 10 minutos sin que el agente tomara el control/respondiera
      else if (pauseDetails && pauseDetails.reason === 'user') {
        const UNPAUSE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
        const timeElapsed = Date.now() - pauseDetails.createdAt;
        if (timeElapsed > UNPAUSE_TIMEOUT_MS) {
          logger.info(`⏰ Transcurrieron ${Math.round(timeElapsed / 1000 / 60)} minutos sin respuesta del asesor para [${profileName}] (${from}). El cliente continuó escribiendo. Despausando bot automáticamente.`);
          shouldUnpause = true;
        }
      }

      if (shouldUnpause) {
        aiService.unpauseConversation(from);
      } else {
        logger.info(`⏸️ Conversación con ${profileName} (${from}) está pausada (creada hace: ${pauseDetails ? Math.round((Date.now() - pauseDetails.createdAt) / 1000 / 60) : '?'}m, motivo: ${pauseDetails ? pauseDetails.reason : 'desconocido'}). Bot no responderá.`);
        return;
      }
    }

    // Si se envía palabra clave de reinicio, forzar eliminación de sesión para volver a Typebot
    if (isResetKeyword) {
      logger.info(`🔄 Reiniciando flujo Typebot para ${profileName} (${from}) debido a palabra clave.`);
      this.userSessions.delete(from);
    }

    // Obtener sesión actual (100% Ruteo por Typebot - IA Gemini/DeepSeek desactivadas temporalmente)
    const session = this.userSessions.get(from);
    const sessionId = session ? (typeof session === 'object' ? session.sessionId : session) : null;
    const sessionState = 'typebot'; // Forzado 100% Typebot


    // 4. RUTEO DE CAPAS COMERCIALES (Typebot o IA)
    if (sessionId && sessionState === 'ai') {
      logger.info(`🧠 Cliente [${profileName}] (${from}) está en la CAPA IA (Gemini/DeepSeek).`);
      
      // --- CAPA IA (Gemini / DeepSeek) ---
      // A. Procesar identificación visual si hay imagen
      let productContext = '';
      let product = null;
      let imageMatchResult = null;

      if (hasImage) {
        const img = images[images.length - 1];
        try {
          if (!from.startsWith('chatwoot_conv_')) {
            await this.sendTextMessage(from, "Un momento, por favor. Estoy analizando tu imagen para identificar el producto... 🔍");
          }

          const { buffer, mimeType } = await this.downloadMetaMedia(img.id);
          const matchResult = await aiService.identifyProductFromImage(buffer, mimeType);
          imageMatchResult = matchResult;

          if (matchResult.matched && matchResult.code) {
            logger.info(`🎯 Producto identificado por imagen: ${matchResult.code}`);
            const searchResults = await catalogService.searchCatalog(matchResult.code);
            product = searchResults[0];

            if (product) {
              const prices = product.precios_venta_sin_igv;
              productContext = '[Contexto de Imagen: El cliente envió una imagen identificada como el producto *' + product.nombre + '* (Código: *' + product.codigo + '*). Color: ' + (product.color || 'Varios') + ', Categoria: ' + product.categoria + '.\n💰 Precios unitarios estimados (sin IGV):\n• 1-5 unidades: ' + prices.precio_1_5_unidades + '\n• 6-12 unidades: ' + prices.precio_6_12_unidades + '\n• 13-50 unidades: ' + prices.precio_13_50_unidades + '\n• 51-499 unidades: ' + prices.precio_51_499_unidades + '\n• 500+ unidades: ' + prices.precio_500_1000_unidades + '\n]';
            }
          }
        } catch (error) {
          logger.error({ msg: 'Error procesando imagen entrante', error: error.message });
        }
      }

      const body = combinedText;
      if (body || productContext) {
        // Detectar intención de atención humana
        const agentKeywords = ['agente', 'asesor', 'humano', 'persona', 'hablar con asesor', 'hablar con alguien', 'atencion humana', 'atención humana', 'hablar con un asesor', 'vendedor'];
        const isAgentIntent = agentKeywords.some(keyword => cleanBody.includes(keyword));

        if (isAgentIntent) {
          logger.info(`👤 Solicitud de atención humana detectada de [${profileName}] (${from}). Pausando bot y transfiriendo a Chatwoot.`);
          aiService.pauseConversation(from, aiService.DEFAULT_PAUSE_DURATION, 'user');
          await this.openChatwootConversation(from); // Cambiar status a open en Chatwoot
          await this.sendTextMessage(from, `¡Claro que sí, ${profileName}! 👩‍💼 He notificado a nuestros asesores comerciales. Un miembro de nuestro equipo tomará tu conversación por aquí en breve. Por favor aguarda unos momentos. 😊`);
          return;
        }

        // Clasificación de catálogo
        const catalogKeywords = [
          'precio', 'costo', 'cotizar', 'cotizacion', 'cotización', 'catalogo', 'catálogo',
          'taza', 'mug', 'termo', 'tomatodo', 'botella', 'llavero', 'destapador', 'lapicero',
          'bolsa', 'cambrell', 'notex', 'corcho', 'ecologico', 'libreta', 'agenda', 'lapiceros',
          'cuánto', 'cuanto', 'cuesta', 'valor', 'stock', 'cantidad', 'colores', 'color', 'muestra'
        ];
        const isCatalogIntent = (catalogKeywords.some(keyword => cleanBody.includes(keyword)) || !!productContext);

        if (isCatalogIntent) {
          logger.info(`🎯 Intención de catálogo detectada de [${profileName}] (${from}): "${body}"`);
          try {
            const promptMsg = productContext ? (productContext + '\n' + (body || 'detalles del producto')) : body;
            const aiResponse = await aiService.generateResponse(from, profileName, promptMsg);
            if (aiResponse) {
              const imageMatch = aiResponse.match(/https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp)/gi);
              if (imageMatch) {
                const imageUrl = imageMatch[0];
                const cleanText = aiResponse.replace(imageUrl, '').trim();
                await this.sendImageMessage(from, imageUrl);
                if (cleanText) {
                  await this.sendTextMessage(from, cleanText);
                }
              } else {
                await this.sendTextMessage(from, aiResponse);
              }
            }

            if (!from.startsWith('chatwoot_conv_')) {
              const lastInput = this.lastUserInputs.get(from);
              if (lastInput && lastInput.type === 'choice input' && lastInput.items && lastInput.items.length > 0) {
                await this.sendInteractive(from, "Por favor, selecciona una de las opciones para continuar con tu cotización:", lastInput.items);
              }
            }
            return;
          } catch (err) {
            logger.error({ msg: 'Error procesando intención de catálogo directa vía IA, activando fallback directo de catálogo', error: err.message });
            try {
              const fallbackCatalog = await catalogService.searchCatalog(cleanBody);
              if (fallbackCatalog && fallbackCatalog.length > 0) {
                const topItem = fallbackCatalog[0];
                const prices = topItem.precios_venta_sin_igv || {};
                const fallbackText = `📦 *${topItem.nombre}* (Código: *${topItem.codigo}*)\n` +
                  `🎨 Color: ${topItem.color || 'Varios'}\n` +
                  `💰 *Precios unitarios estimativos (sin IGV):*\n` +
                  `• 500+ unidades: *S/ ${prices.precio_500_mas || topItem.precio_unidad}*\n` +
                  `• 50-499 unidades: *S/ ${prices.precio_50_499 || topItem.precio_unidad}*\n` +
                  `• 1-49 unidades: *S/ ${prices.precio_1_49 || topItem.precio_unidad}*\n\n` +
                  `¿Te gustaría cotizar este modelo o necesitas información de otro producto? 😊`;
                await this.sendTextMessage(from, fallbackText);
              } else {
                await this.sendTextMessage(from, `¡Hola, ${profileName}! He recibido tu mensaje sobre nuestros productos. ¿Cuántas unidades te gustaría cotizar de tu proyecto? 😊`);
              }
            } catch (fallbackErr) {
              logger.error({ msg: 'Error en el fallback de catálogo', error: fallbackErr.message });
            }
            return;
          }
        }

        if (hasImage && !product && !body) {
          await this.sendTextMessage(from, "No logré identificar ese producto exactamente desde la imagen 🔍. ¿Podrías describirme qué artículo es? Por ejemplo: *\"taza de cerámica 11oz\"* o *\"bolsa ecológica con cierre\"*. Así puedo buscarlo en nuestro catálogo y darte precios al instante. 😊");
          return;
        }

        if (hasImage && product && !body) {
          const prices = product.precios_venta_sin_igv;
          const prefix = imageMatchResult.isAlternative
            ? 'No encontré ese modelo exacto en catálogo, pero encontré la opción más similar disponible:'
            : '¡Excelente! He identificado el producto de tu foto:';

          const quoteMessage = prefix + '\n\n' +
            '📦 *' + product.nombre + '*\n' +
            '🔢 Código: *' + product.codigo + '*\n' +
            '🎨 Color: ' + (product.color || 'Varios') + '\n' +
            '📂 Categoría: ' + product.categoria + '\n\n' +
            '💰 *Precios unitarios estimados (sin IGV):*\n' +
            '• 1-5 unidades: *' + prices.precio_1_5_unidades + '*\n' +
            '• 6-12 unidades: *' + prices.precio_6_12_unidades + '*\n' +
            '• 13-50 unidades: *' + prices.precio_13_50_unidades + '*\n' +
            '• 51-499 unidades: *' + prices.precio_51_499_unidades + '*\n' +
            '• 500+ unidades: *' + prices.precio_500_1000_unidades + '*\n\n' +
            '¿Qué te gustaría hacer ahora?';

          await this.sendTextMessage(from, quoteMessage);

          if (!from.startsWith('chatwoot_conv_')) {
            const options = [
              { id: 'block-choice-loopmenu-item-cotizar', content: '📦 Cotizar otro producto' },
              { id: 'block-choice-loopmenu-item-asesor', content: '👩‍💼 Hablar con asesor' }
            ];
            await this.sendInteractive(from, 'Selecciona una opción:', options);
          }
          return;
        }

        // Si no es intención de catálogo explícita, procesar con conversación libre de IA
        const aiResponse = await aiService.generateResponse(from, profileName, body);
        if (aiResponse) {
          await this.sendTextMessage(from, aiResponse);
        }
      }
    } else {
      // --- CAPA FILTRO (Typebot) ---
      logger.info(`🤖 Cliente [${profileName}] (${from}) está en la CAPA FILTRO (Typebot).`);
      
      const body = combinedText;
      if (body || uploadedImageUrl) {
        // Detectar intención de atención humana explícita antes de seguir en Typebot
        const agentKeywords = ['agente', 'asesor', 'humano', 'persona', 'hablar con asesor', 'hablar con alguien', 'atencion humana', 'atención humana', 'hablar con un asesor', 'vendedor'];
        const isAgentIntent = agentKeywords.some(keyword => cleanBody.includes(keyword));

        if (isAgentIntent) {
          logger.info(`👤 Solicitud de atención humana detectada de [${profileName}] (${from}). Pausando bot y transfiriendo a Chatwoot.`);
          aiService.pauseConversation(from, aiService.DEFAULT_PAUSE_DURATION, 'user');
          await this.openChatwootConversation(from); // Cambiar status a open en Chatwoot
          await this.sendTextMessage(from, `¡Claro que sí, ${profileName}! 👩‍💼 He notificado a nuestros asesores comerciales. Un miembro de nuestro equipo tomará tu conversación por aquí en breve. Por favor aguarda unos momentos. 😊`);
          return;
        }

        try {
          let currentSessionId = sessionId;
          let response;
          const typebotUrl = process.env.TYPEBOT_API_URL || 'http://typebot-viewer:3000';
          const typebotId = process.env.TYPEBOT_ID || 'jgis-publicidad-bot-f33vo50';

          if (!currentSessionId) {
            logger.info(`🔄 Iniciando nueva sesión de Typebot (${typebotId}) para ${profileName} (${from}) [Meta Ads Campaign]`);
            response = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, {
              prefilledVariables: {
                phone: from.startsWith('chatwoot_conv_') ? '' : from,
                name: profileName || 'Cliente Meta Ads',
                ad_headline: referral?.headline || 'Campaña Anuncio de Gorras Meta Ads',
                ad_body: referral?.body || '',
                ad_id: referral?.ad_id || ''
              }
            });
            currentSessionId = response.data.sessionId;
            this.userSessions.set(from, { sessionId: currentSessionId, state: 'typebot' });
          } else {
            logger.info(`💬 Continuando sesión de Typebot ${currentSessionId} para ${from}`);
            const textToSend = uploadedImageUrl || body;
            response = await axios.post(`${typebotUrl}/api/v1/sessions/${currentSessionId}/continueChat`, {
              message: { type: 'text', text: textToSend }
            });
          }

          if (response && response.data) {
            const messages = response.data.messages || [];
            const input = response.data.input;

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
              logger.info(`⚠️ Mensaje no comprendido en Typebot para ${profileName} (${from}). Enviando mensaje de ayuda.`);
              await this.sendTextMessage(from, "Disculpa, no comprendí esa opción. Por favor selecciona una de las opciones del menú.");
              if (!from.startsWith('chatwoot_conv_') && input && input.type === 'choice input' && input.items && input.items.length > 0) {
                await this.sendInteractive(from, "Por favor, selecciona una de las opciones para continuar:", input.items);
              }
            } else {
              await this.processTypebotMessages(from, messages, input);
            }

            // Si el flujo de Typebot terminó (no hay más inputs de respuesta esperados),
            // cambiar el estado de la sesión a 'ai' para que la IA atienda las consultas libres en el siguiente mensaje
            if (!input) {
              logger.info(`🏁 Typebot completó la secuencia comercial para ${from}. Sesión mantenida en Typebot.`);
              this.userSessions.set(from, { sessionId: currentSessionId, state: 'typebot' });
            }
          }
        } catch (err) {
          logger.error({ msg: 'Error al comunicarse con Typebot Engine:', error: err.message });
          await this.sendTextMessage(from, "👋 ¡Hola! Un asesor comercial de *Corporación JGIS* te atenderá en breve. Escribe *'inicio'* para reiniciar el menú.");
        }
      }
    }

    // Si la conversación fue pausada por la IA (intención de asesor o fallback de error)
    if (aiService.isConversationPaused(from)) {
      await this.openChatwootConversation(from);
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
    if (typeof to === 'string' && to.startsWith('chatwoot_conv_')) {
      const conversationId = to.replace('chatwoot_conv_', '');
      await this.sendChatwootMessage(conversationId, text);
      return;
    }

    if (!config.ACCESS_TOKEN || !config.PHONE_NUMBER_ID) {
      logger.warn('No se puede enviar respuesta automática: ACCESS_TOKEN o PHONE_NUMBER_ID no configurados.');
      return;
    }

    try {
      logger.debug({ msg: 'Enviando mensaje de WhatsApp a Meta', to, text });
      
      const response = await axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v25.0/' + config.PHONE_NUMBER_ID + '/messages',
        headers: {
          'Authorization': 'Bearer ' + config.ACCESS_TOKEN,
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
    if (typeof to === 'string' && to.startsWith('chatwoot_conv_')) {
      const conversationId = to.replace('chatwoot_conv_', '');
      const optionsText = items.map((item, idx) => {
        const content = typeof item === 'string' ? item : item.content;
        return `[${idx + 1}] ${content}`;
      }).join('\n');
      const combinedText = `${text}\n\nOpciones:\n${optionsText}`;
      await this.sendChatwootMessage(conversationId, combinedText);
      return;
    }

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
      // Pre-registrar en caché de contenido pendiente ANTES de enviar HTTP para evitar race condition con el webhook de Chatwoot
      if (text) this.pendingBotSentContent.set(text.trim(), true);
      if (imageFileName) this.pendingBotSentContent.set(imageFileName.trim(), true);

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
      // Guardar el ID (en String y Number) para saber que este mensaje fue enviado por el bot
      this.botSentMessageIds.add(sentMessageId);
      this.botSentMessageIds.add(String(sentMessageId));
      if (!isNaN(sentMessageId)) {
        this.botSentMessageIds.add(Number(sentMessageId));
      }

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
    
    // Si detectamos un estado 'sent' o 'delivered' de un mensaje enviado por el bot,
    // mantener el ID en botSentMessageIds para evitar que actualizaciones posteriores de estado generen falsos positivos de atención humana.
    if (state === 'sent' || state === 'delivered' || state === 'read') {
      if (this.botSentMessageIds.has(messageId)) {
        logger.debug({ msg: 'Confirmación de estado de mensaje del bot recibida', messageId, state, recipient });
        return;
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
    if (typeof mediaId === 'string' && (mediaId.startsWith('http://') || mediaId.startsWith('https://'))) {
      try {
        logger.debug({ msg: 'Descargando multimedia directamente por URL (Chatwoot)', url: mediaId });
        const response = await axios({
          method: 'GET',
          url: mediaId,
          responseType: 'arraybuffer'
        });
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        return {
          buffer: Buffer.from(response.data),
          mimeType
        };
      } catch (error) {
        logger.error({ msg: 'Error al descargar archivo desde URL directa', url: mediaId, error: error.message });
        throw error;
      }
    }

    if (!config.ACCESS_TOKEN) {
      throw new Error('ACCESS_TOKEN no configurado para descarga de multimedia.');
    }

    try {
      logger.debug({ msg: 'Consultando metadatos de multimedia en Meta', mediaId });
      // 1. Obtener la URL de descarga binaria
      const metadataResponse = await axios({
        method: 'GET',
        url: 'https://graph.facebook.com/v25.0/' + mediaId,
        headers: {
          'Authorization': 'Bearer ' + config.ACCESS_TOKEN
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
          'Authorization': 'Bearer ' + config.ACCESS_TOKEN
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
  async syncIncomingMessageToChatwoot(phone, name, text, fileBuffer, fileName, mimeType) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      logger.warn('No se puede sincronizar a Chatwoot: token o ID de cuenta no configurado.');
      return;
    }
    if (typeof phone === 'string' && phone.startsWith('chatwoot_conv_')) {
      return;
    }

    // Deduplicación estricta por teléfono + contenido para evitar duplicados en la UI de Chatwoot
    const syncKey = `chatwoot_in_${phone}_${(text || fileName || 'msg').substring(0, 40)}`;
    if (this.processedMessageIds.has(syncKey)) {
      logger.info({ msg: '🛑 Sincronización entrante duplicada a Chatwoot omitida por syncKey', phone, syncKey });
      return;
    }
    this.processedMessageIds.add(syncKey);

    try {
      const conversationId = await this.getOrCreateConversationId(phone, name);
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
      
      let response;
      if (fileBuffer) {
        const formData = new FormData();
        formData.append('content', text || '');
        formData.append('message_type', 'incoming');
        formData.append('private', 'false');
        
        const blob = new Blob([fileBuffer], { type: mimeType || 'image/jpeg' });
        formData.append('attachments[]', blob, fileName || 'whatsapp_image.jpg');

        response = await axios.post(url, formData, {
          headers: {
            'api_access_token': config.CHATWOOT_ACCESS_TOKEN
          }
        });
      } else {
        response = await axios({
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
      }
      logger.info({ msg: 'Mensaje entrante de WhatsApp sincronizado con Chatwoot', conversationId, messageId: response.data.id });
    } catch (error) {
      const errRes = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Error al sincronizar mensaje entrante con Chatwoot', phone, error: errRes });
    }
  }

  /**
   * Sincroniza la atribución de Meta Ads (referral) como nota privada en Chatwoot.
   */
  async syncReferralToChatwoot(phone, name, referral) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      return;
    }
    if (typeof phone === 'string' && phone.startsWith('chatwoot_conv_')) {
      return;
    }

    try {
      const conversationId = await this.getOrCreateConversationId(phone, name);
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
      
      const referralText = `📢 [META ADS REFERRAL]\nEl cliente inició la conversación desde un anuncio de Meta.\n\n• Headline: ${referral.headline || 'Sin título'}\n• Body: ${referral.body || 'Sin descripción'}\n• Ad ID: ${referral.source_id || 'N/A'}\n• Source URL: ${referral.source_url || 'N/A'}`;

      let mediaUrl = referral.media_url || referral.image_url || referral.video_url || referral.thumbnail_url;

      // Intentar extraer la imagen directa si viene de un post de Instagram
      if (!mediaUrl && referral.source_url) {
        const urlStr = referral.source_url;
        if (urlStr.includes('instagram.com/p/')) {
          const match = urlStr.match(/https?:\/\/(?:www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+/i);
          if (match) {
            mediaUrl = match[0] + '/media/?size=l';
          }
        }
      }

      let response;
      if (mediaUrl) {
        try {
          const { buffer, mimeType } = await this.downloadMetaMedia(mediaUrl);
          
          let ext = '.jpg';
          if (mimeType === 'image/png') ext = '.png';
          else if (mimeType === 'image/gif') ext = '.gif';
          const fileName = 'meta_ad_image_' + Date.now() + ext;

          const formData = new FormData();
          formData.append('content', referralText);
          formData.append('message_type', 'outgoing');
          formData.append('private', 'true');
          
          const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });
          formData.append('attachments[]', blob, fileName);

          response = await axios.post(url, formData, {
            headers: {
              'api_access_token': config.CHATWOOT_ACCESS_TOKEN
            }
          });
          
          const sentMessageId = response.data.id;
          this.botSentMessageIds.add(sentMessageId);

          logger.info({ msg: 'Atribución Meta Ads con imagen sincronizada en nota privada de Chatwoot', conversationId, messageId: sentMessageId });
          return;
        } catch (downloadErr) {
          logger.error({ msg: 'No se pudo descargar la imagen del ad referral, enviando solo texto', error: downloadErr.message });
        }
      }

      // Enviar solo texto
      response = await axios({
        method: 'POST',
        url,
        headers: {
          'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        data: {
          content: referralText,
          message_type: 'outgoing',
          private: true
        }
      });

      const sentMessageId = response.data.id;
      this.botSentMessageIds.add(sentMessageId);

      logger.info({ msg: 'Atribución Meta Ads de texto sincronizada en nota privada de Chatwoot', conversationId, messageId: sentMessageId });
    } catch (error) {
      const errRes = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Error al sincronizar ad referral con Chatwoot', phone, error: errRes });
    }
  }

  /**
   * Abre la conversación en Chatwoot (cambia status a open) para alertar al agente con sonido.
   */
  async openChatwootConversation(phone) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      return;
    }
    if (typeof phone === 'string' && phone.startsWith('chatwoot_conv_')) {
      return;
    }

    try {
      const conversationId = await this.getOrCreateConversationId(phone, 'Cliente');
      const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/toggle_status`;
      
      await axios.post(url, { status: 'open' }, {
        headers: {
          'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      logger.info({ msg: 'Conversación de Chatwoot reabierta para atención humana', conversationId });
    } catch (error) {
      const errRes = error.response ? error.response.data : error.message;
      logger.error({ msg: 'Error al reabrir conversación de Chatwoot', phone, error: errRes });
    }
  }

  /**
   * Sincroniza un mensaje saliente enviado por el bot hacia Chatwoot.
   */
  async syncOutgoingMessageToChatwoot(phone, text, imageFileName) {
    if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
      return;
    }

    // Deduplicación estricta por teléfono + contenido para evitar duplicados en la UI de Chatwoot
    const keyText = imageFileName ? imageFileName : (text || 'msg').trim().slice(-40);
    const syncKey = `chatwoot_out_${phone}_${keyText}`;
    if (this.processedMessageIds.has(syncKey)) {
      logger.info({ msg: '🛑 Sincronización saliente duplicada a Chatwoot omitida por syncKey', phone, syncKey });
      return;
    }
    this.processedMessageIds.add(syncKey);

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
  /**
   * Obtiene o crea una conversación en Chatwoot para un número telefónico.
   * Garantiza la reutilización de contactos y reabre conversaciones resueltas en lugar de duplicarlas.
   */
  async getOrCreateConversationId(phone, name) {
    if (!phone) throw new Error('Número de teléfono no provisto para Chatwoot.');
    
    // Normalizar teléfono a dígitos puros para la clave de caché y búsquedas (evita discrepancias con/sin +)
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (this.chatwootConversations.has(cleanPhone)) {
      return this.chatwootConversations.get(cleanPhone);
    }

    const accountId = config.CHATWOOT_ACCOUNT_ID;
    const userToken = config.CHATWOOT_ACCESS_TOKEN;
    const inboxId = parseInt(process.env.CHATWOOT_INBOX_ID || '1');
    const headers = {
      'api_access_token': userToken,
      'Content-Type': 'application/json'
    };

    const formattedPhone = `+${cleanPhone}`;

    let contactId;
    // 1. Buscar contacto existente (codificando URI para evitar que '+' se convierta en espacio)
    try {
      const searchRes = await axios.get(
        `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`,
        { headers }
      );
      let contacts = searchRes.data.payload || [];

      // Si no encuentra con +, buscar por número sin +
      if (contacts.length === 0) {
        const searchResNoPlus = await axios.get(
          `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/search?q=${cleanPhone}`,
          { headers }
        );
        contacts = searchResNoPlus.data.payload || [];
      }

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
        // Si ya existe por colisión de índice, intentar recuperar de nuevo
        const errResponse = err.response ? err.response.data : err.message;
        logger.warn({ msg: 'Aviso al crear contacto en Chatwoot, reintentando búsqueda', error: errResponse });
        try {
          const searchResRetry = await axios.get(
            `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/search?q=${cleanPhone}`,
            { headers }
          );
          const contactsRetry = searchResRetry.data.payload || [];
          if (contactsRetry.length > 0) {
            contactId = contactsRetry[0].id;
          } else {
            throw err;
          }
        } catch (retryErr) {
          logger.error({ msg: 'Error fatal creando contacto en Chatwoot', error: retryErr.message });
          throw retryErr;
        }
      }
    }

    // 3. Buscar conversacion activa o previa
    let conversationId;
    try {
      const conversationsRes = await axios.get(
        `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
        { headers }
      );
      const conversations = conversationsRes.data.payload || [];
      
      // Buscar primero conversación abierta o pausada
      const activeConv = conversations.find(c => c.status === 'open' || c.status === 'snoozed');
      if (activeConv) {
        conversationId = activeConv.id;
      } else if (conversations.length > 0) {
        // Reutilizar y reabrir la última conversación resuelta para evitar duplicar chats
        const lastConv = conversations[0];
        try {
          await axios.post(
            `${config.CHATWOOT_API_URL}/api/v1/accounts/${accountId}/conversations/${lastConv.id}/toggle_status`,
            { status: 'open' },
            { headers }
          );
          logger.info({ msg: 'Conversación previa reabierta en Chatwoot', conversationId: lastConv.id });
        } catch (reopenErr) {
          logger.warn({ msg: 'No se pudo cambiar el estado de la conversación, usando ID existente', error: reopenErr.message });
        }
        conversationId = lastConv.id;
      }
    } catch (err) {
      logger.error({ msg: 'Error buscando conversaciones en Chatwoot', contactId, error: err.message });
    }

    // 4. Crear nueva conversación solo si la persona nunca ha tenido una
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
        logger.info({ msg: 'Nueva conversación creada en Chatwoot', conversationId, contactId });
      } catch (err) {
        logger.error({ msg: 'Error creando conversación en Chatwoot', error: err.response ? err.response.data : err.message });
        throw err;
      }
    }

    this.chatwootConversations.set(cleanPhone, conversationId);
    return conversationId;
  }
}

module.exports = new MessageService();
