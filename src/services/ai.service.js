/**
 * Servicio de Inteligencia Artificial compatible con Google Gemini y DeepSeek.
 * Gestiona la conversación con contexto, historial unificado y failover dinámico.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const logger = require('../utils/logger');
const { SYSTEM_PROMPT } = require('../config/botPersonality');
const catalogService = require('./catalog.service');
const { TTLCache } = require('../utils/ttlCache');

class AiService {
  constructor() {
    this.genAI = null;
    this.geminiModel = null;
    // Almacén de historial de conversación acotado con TTL (24 horas)
    // Se guarda en formato unificado: { role: 'user' | 'assistant', content: string }
    this.conversationHistory = new TTLCache(24 * 60 * 60 * 1000, 2000);
    // Almacén de números pausados con TTL (2 horas)
    this.pausedConversations = new TTLCache(2 * 60 * 60 * 1000, 2000);
    this.MAX_HISTORY = 20;
    // Duración de la pausa por defecto (2 horas en milisegundos)
    this.DEFAULT_PAUSE_DURATION = 2 * 60 * 60 * 1000;
  }

  /**
   * Pausa las respuestas automáticas del bot para un número de teléfono.
   * @param {string} phoneNumber Número del cliente.
   * @param {number} durationMs Duración de la pausa en milisegundos.
   * @param {string} reason Motivo de la pausa.
   */
  pauseConversation(phoneNumber, durationMs = this.DEFAULT_PAUSE_DURATION, reason = 'manual') {
    const now = Date.now();
    const expiration = now + durationMs;
    this.pausedConversations.set(phoneNumber, {
      expiration,
      createdAt: now,
      reason
    }, durationMs);
    logger.info(`⏸️ Respuestas del bot pausadas para ${phoneNumber} (motivo: ${reason}) hasta las ${new Date(expiration).toLocaleTimeString()}`);
  }

  /**
   * Verifica si la conversación con un número está actualmente pausada.
   * @param {string} phoneNumber Número del cliente.
   * @returns {boolean} True si está pausada.
   */
  isConversationPaused(phoneNumber) {
    return this.pausedConversations.has(phoneNumber);
  }

  getPauseDetails(phoneNumber) {
    return this.pausedConversations.get(phoneNumber);
  }

  /**
   * Despausa inmediatamente una conversación.
   * @param {string} phoneNumber Número del cliente.
   */
  unpauseConversation(phoneNumber) {
    if (this.pausedConversations.has(phoneNumber)) {
      this.pausedConversations.delete(phoneNumber);
      logger.info(`▶️ Bot reactivado manualmente para ${phoneNumber}`);
    }
  }

  /**
   * Inicializa los clientes de IA con sus respectivas API Keys.
   */
  initialize() {
    // 1. Inicializar Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(geminiKey);
        this.geminiModel = this.genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 500, // Limitar para WhatsApp (mensajes cortos)
          },
          tools: [{
            functionDeclarations: [{
              name: 'searchCatalog',
              description: 'Busca productos en el catálogo consolidado de JGIS Publicidad. Debe usarse siempre que el cliente solicite precios, cotizaciones o artículos.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: {
                    type: 'STRING',
                    description: 'Término de búsqueda del producto (ej: "taza", "tomatodo metal", "bolsa notex")',
                  },
                },
                required: ['query'],
              },
            }]
          }]
        });
        logger.info({ msg: '🧠 Servicio de Gemini AI inicializado correctamente.', model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
      } catch (error) {
        logger.error({ msg: 'Error al inicializar Gemini AI', error: error.message });
      }
    }

    // 2. Validar presencia de DeepSeek
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      logger.info('🧠 Servicio de DeepSeek AI configurado correctamente.');
    } else {
      logger.warn('DEEPSEEK_API_KEY no configurada. El bot operará exclusivamente con Gemini.');
    }

    return !!(geminiKey || deepseekKey);
  }

  /**
   * Obtiene o crea el historial de conversación para un número.
   * @param {string} phoneNumber Número del cliente.
   * @returns {Array} Historial de mensajes en formato unificado.
   */
  getHistory(phoneNumber) {
    let history = this.conversationHistory.get(phoneNumber);
    if (!history) {
      history = [];
      this.conversationHistory.set(phoneNumber, history);
    }
    return history;
  }

  /**
   * Agrega un mensaje al historial unificado.
   * @param {string} phoneNumber Número del cliente.
   * @param {string} role 'user' o 'assistant'.
   * @param {string} content Contenido del mensaje.
   */
  addToHistory(phoneNumber, role, content) {
    const history = this.getHistory(phoneNumber);
    history.push({ role, content });

    // Recortar historial si excede el máximo
    if (history.length > this.MAX_HISTORY) {
      history.splice(0, history.length - this.MAX_HISTORY);
    }
    this.conversationHistory.set(phoneNumber, history);
  }

  /**
   * Genera una respuesta de IA para el mensaje del cliente alternando proveedores o aplicando failover.
   * @param {string} phoneNumber Número del cliente.
   * @param {string} profileName Nombre del perfil del cliente.
   * @param {string} userMessage Mensaje recibido del cliente.
   * @returns {string} Respuesta generada por la IA.
   */
  async generateResponse(phoneNumber, profileName, userMessage) {
    // 1. Verificar si la conversación está pausada (traspaso a humano)
    if (this.isConversationPaused(phoneNumber)) {
      logger.debug(`⏭️ Omitiendo respuesta de IA para ${phoneNumber} porque la conversación está pausada.`);
      return null;
    }

    // 2. Verificar palabras clave de parada explícita
    const cleanInput = userMessage.toLowerCase().trim();
    const explicitTransferKeywords = ['agente', 'asesor', 'humano', 'persona', 'vendedor', 'atencion al cliente', 'atención al cliente'];
    const matchesKeyword = explicitTransferKeywords.some(kw => cleanInput.includes(kw));

    if (matchesKeyword) {
      this.pauseConversation(phoneNumber, this.DEFAULT_PAUSE_DURATION, 'user');
      return `Entendido, ${profileName}. Te estoy comunicando con un asesor en este momento. Por favor espera unos minutos. 🙏`;
    }

    const primaryProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    try {
      if (primaryProvider === 'deepseek') {
        try {
          return await this.generateDeepseekResponse(phoneNumber, profileName, userMessage);
        } catch (dsError) {
          logger.error({ msg: 'Falla en DeepSeek, intentando failover a Gemini', error: dsError.message });
          if (this.geminiModel) {
            return await this.generateGeminiResponse(phoneNumber, profileName, userMessage);
          }
          throw dsError;
        }
      } else {
        try {
          return await this.generateGeminiResponse(phoneNumber, profileName, userMessage);
        } catch (geminiError) {
          logger.error({ msg: 'Falla en Gemini, intentando failover a DeepSeek', error: geminiError.message });
          if (process.env.DEEPSEEK_API_KEY) {
            return await this.generateDeepseekResponse(phoneNumber, profileName, userMessage);
          }
          throw geminiError;
        }
      }
    } catch (error) {
      logger.error({
        msg: '⚠️ Excepción en proveedores de IA, ejecutando fallback a respuesta comercial estática',
        phoneNumber,
        errorName: error.name,
        errorMessage: error.message,
      });

      // NO PAUSAR la conversación ante errores de API de IA. Entregar speech comercial directo de cierre.
      return `¡Hola, ${profileName}! 👋 Gracias por contactar a *Corporación JGIS* 🎨✨

📌 *Disponible:* Costo S/. 15

🚚 *¿Método de entrega?*
• Envíos a todo el Perú 🇵🇪
• Recojo en tienda 🏬

⏱️ *Tiempo de entrega (producción):* 48 horas

---

💳 *Datos de Pago*

*Titular:* *Corporación JGIS*

🏦 *Banco BCP*
• *Cuenta Corriente en Soles:* *1912434894087*
• *CCI (Código de Cuenta Interbancaria):* *00219100243489408755*

📱 *Yape / Plin:* *969732451*
• *Titular:* *Corporación JGIS*

---

📍 *Dirección de Tienda*

🏢 *Galería Centro Comercial Centro Lima*
🏬 *Sótano – Pasaje "H", Stand 560*
🔹 *Referencia:* Cerca de la *Puerta 7 (Boulevard)*`;
    }
  }

  /**
   * Genera respuesta utilizando Gemini.
   */
  async generateGeminiResponse(phoneNumber, profileName, userMessage) {
    if (!this.geminiModel) {
      throw new Error('Modelo Gemini no inicializado.');
    }

    const contextualMessage = `[Cliente: ${profileName}, Teléfono: ${phoneNumber}]\n${userMessage}`;
    const rawHistory = this.getHistory(phoneNumber);

    // Mapear historial unificado al formato que espera Gemini
    const geminiHistory = rawHistory.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const chat = this.geminiModel.startChat({
      history: geminiHistory.length > 0 ? geminiHistory : undefined,
    });

    let result = await chat.sendMessage(contextualMessage);
    let functionCalls = result.response.functionCalls();

    // Loop recursivo de llamadas a funciones (herramientas)
    while (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of functionCalls) {
        if (call.name === 'searchCatalog') {
          const query = call.args.query;
          const searchResults = await catalogService.searchCatalog(query);
          
          functionResponses.push({
            functionResponse: {
              name: 'searchCatalog',
              response: { results: searchResults }
            }
          });
        }
      }

      logger.debug({ msg: 'Enviando respuestas de función a Gemini', count: functionResponses.length });
      result = await chat.sendMessage(functionResponses);
      functionCalls = result.response.functionCalls();
    }

    const textResponse = result.response.text();

    // Guardar en el historial unificado
    this.addToHistory(phoneNumber, 'user', contextualMessage);
    this.addToHistory(phoneNumber, 'assistant', textResponse);

    logger.info({
      msg: '🧠 Respuesta de Gemini AI generada',
      phoneNumber,
      profileName,
    });

    return textResponse;
  }

  /**
   * Genera respuesta utilizando DeepSeek con function calling.
   */
  async generateDeepseekResponse(phoneNumber, profileName, userMessage) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY no configurada.');
    }

    const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const contextualMessage = `[Cliente: ${profileName}, Teléfono: ${phoneNumber}]\n${userMessage}`;
    const rawHistory = this.getHistory(phoneNumber);

    // Mapear historial al formato OpenAI/DeepSeek
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    for (const h of rawHistory) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: contextualMessage });

    const tools = [
      {
        type: 'function',
        function: {
          name: 'searchCatalog',
          description: 'Busca productos en el catálogo consolidado de JGIS Publicidad. Retorna el código de producto, nombre, descripción, stock, color, procedencia (origen) y escala de precios (precio unitario para 500+ unidades, 50+ unidades y 1-49 unidades). Debe usarse obligatoriamente siempre que el cliente solicite precios, cotizaciones, stock, colores, o pregunte si contamos con algún artículo de merchandising.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Término de búsqueda del producto (ej: "taza", "tomatodo metal", "bolsa notex")'
              }
            },
            required: ['query']
          }
        }
      }
    ];

    let apiResponse = await axios.post('https://api.deepseek.com/chat/completions', {
      model: modelName,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let messageData = apiResponse.data.choices[0].message;

    // Loop recursivo de llamadas a herramientas (function calling)
    while (messageData.tool_calls && messageData.tool_calls.length > 0) {
      messages.push(messageData); // Agregar llamada del modelo al historial de la petición actual

      for (const tc of messageData.tool_calls) {
        if (tc.function.name === 'searchCatalog') {
          const args = JSON.parse(tc.function.arguments);
          const searchResults = await catalogService.searchCatalog(args.query);
          
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: 'searchCatalog',
            content: JSON.stringify({ results: searchResults })
          });
        }
      }

      logger.debug({ msg: 'Enviando respuestas de función a DeepSeek' });
      
      apiResponse = await axios.post('https://api.deepseek.com/chat/completions', {
        model: modelName,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      messageData = apiResponse.data.choices[0].message;
    }

    const textResponse = messageData.content;

    // Guardar en el historial unificado
    this.addToHistory(phoneNumber, 'user', contextualMessage);
    this.addToHistory(phoneNumber, 'assistant', textResponse);

    logger.info({
      msg: '🧠 Respuesta de DeepSeek AI generada',
      phoneNumber,
      profileName,
    });

    return textResponse;
  }

  /**
   * Limpia el historial de una conversación específica.
   * @param {string} phoneNumber Número del cliente.
   */
  clearHistory(phoneNumber) {
    this.conversationHistory.delete(phoneNumber);
    logger.debug({ msg: 'Historial de conversación limpiado', phoneNumber });
  }

  /**
   * Identifica un producto del catálogo JGIS a partir del buffer de una imagen.
   * @param {Buffer} imageBuffer Buffer binario de la imagen.
   * @param {string} mimeType Tipo MIME de la imagen (ej: 'image/jpeg').
   * @returns {Object} { matched: boolean, code: string, reason: string }
   */
  async identifyProductFromImage(imageBuffer, mimeType) {
    if (!this.genAI) {
      logger.warn('Gemini AI no inicializado al intentar identificar producto por imagen.');
      return { matched: false, code: '' };
    }

    try {
      logger.info({ msg: 'Iniciando identificación visual en dos etapas...', mimeType });
      
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType
        }
      };

      // Etapa 1: Preguntar a Gemini Vision qué producto de merchandising es
      const descModel = this.genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
      const descPrompt = `
        Analiza la imagen adjunta del producto de merchandising.
        Genera una lista de 4 a 6 palabras clave o sinónimos en español e inglés que describan el artículo para buscarlo en una base de datos de catálogo (por ejemplo, si es un vaso o taza térmica, incluye palabras como: "mug", "thermo", "termo", "vaso", "tomatodo", "taza").
        Debes incluir términos genéricos, colores visibles y términos comunes de merchandising (ej: "lapicero", "bolígrafo", "esfero", "pluma", "metalico", "plastico").
        Responde ÚNICAMENTE con las palabras clave separadas por espacios. No agregues puntuación, explicaciones, ni formato de markdown.
      `;
      
      const descResult = await descModel.generateContent([descPrompt, imagePart]);
      const searchTerms = descResult.response.text().trim().replace(/['"«»]/g, '');
      logger.info({ msg: 'Términos de descripción generados por Gemini Vision', searchTerms });

      // Etapa 2: Obtener candidatos coincidentes de la base de datos Postgres
      const candidates = await catalogService.getCandidatesForImage(searchTerms);
      logger.info({ msg: 'Candidatos obtenidos desde base de datos', count: candidates.length });

      if (candidates.length === 0) {
        logger.warn('⚠️ No se encontraron candidatos en la base de datos Postgres para la imagen.');
        return { matched: false, code: '', isAlternative: false, reason: 'No se encontraron artículos similares en catálogo.' };
      }

      // Etapa 3: Comparar la foto contra los candidatos seleccionados
      const prompt = `
        Analiza detalladamente la foto del producto de merchandising adjunta.
        Compara sus características visuales (forma, material, color, tapas, etc.) contra esta lista de candidatos oficiales de catálogo en formato JSON:
        ${JSON.stringify(candidates)}
        
        Tu tarea es identificar la coincidencia más cercana o el producto más similar dentro de esta lista de candidatos.
        Incluso si no es el modelo exacto, si la forma y tipo coinciden, selecciónalo como una coincidencia por similitud.
        
        Responde estrictamente en formato JSON válido con la siguiente estructura (sin formato de markdown ni caracteres extraños):
        {
          "matched": true,
          "code": "CÓDIGO_DEL_PRODUCTO_MÁS_SIMILAR_ENCONTRADO",
          "isAlternative": true,
          "reason": "Explicación breve de por qué coincide o por qué es la mejor alternativa similar encontrada"
        }
        
        Si el objeto de la foto no tiene ninguna relación con los productos del catálogo, responde con "matched": false, "code": "", "isAlternative": false, "reason": "No se parece a ningún artículo en catálogo".
      `;

      const result = await descModel.generateContent([prompt, imagePart]);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      logger.info({ msg: 'Identificación visual en dos etapas completada con éxito', matched: parsed.matched, code: parsed.code });
      return parsed;
    } catch (error) {
      logger.error({ msg: 'Error en la identificación de producto por imagen', error: error.message });
      return { matched: false, code: '' };
    }
  }
}

module.exports = new AiService();

