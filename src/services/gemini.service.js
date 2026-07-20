/**
 * Servicio de Inteligencia Artificial usando Google Gemini.
 * Gestiona la conversación con contexto y personalidad configurable.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { SYSTEM_PROMPT } = require('../config/botPersonality');
const catalogService = require('./catalog.service');
const { TTLCache } = require('../utils/ttlCache');


class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    // Almacén de historial de conversación acotado con TTL (24 horas)
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
   */
  pauseConversation(phoneNumber, durationMs = this.DEFAULT_PAUSE_DURATION) {
    const expiration = Date.now() + durationMs;
    this.pausedConversations.set(phoneNumber, expiration, durationMs);
    logger.info(`⏸️ Respuestas del bot pausadas para ${phoneNumber} hasta las ${new Date(expiration).toLocaleTimeString()}`);
  }

  /**
   * Verifica si la conversación con un número está actualmente pausada.
   * @param {string} phoneNumber Número del cliente.
   * @returns {boolean} True si está pausada.
   */
  isConversationPaused(phoneNumber) {
    return this.pausedConversations.has(phoneNumber);
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
   * Inicializa el cliente de Gemini con la API Key.
   */
  initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY no configurada. El bot responderá con mensajes predeterminados.');
      return false;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 500, // Limitar para WhatsApp (mensajes cortos)
        },
        tools: [{
          functionDeclarations: [
            {
              name: 'searchCatalog',
              description: 'Busca productos en el catálogo consolidado de JGIS Publicidad. Retorna el código de producto, nombre, descripción, stock, color, procedencia (origen) y escala de precios (precio unitario para 500+ unidades, 50+ unidades y 1-49 unidades). Debe usarse obligatoriamente siempre que el cliente solicite precios, cotizaciones, stock, colores, o pregunte si contamos con algún artículo de merchandising.',
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
            },
          ],
        }],
      });

      logger.info('🧠 Servicio de Gemini AI inicializado correctamente.');
      return true;
    } catch (error) {
      logger.error({ msg: 'Error al inicializar Gemini AI', error: error.message });
      return false;
    }
  }

  /**
   * Obtiene o crea el historial de conversación para un número.
   * @param {string} phoneNumber Número del cliente.
   * @returns {Array} Historial de mensajes.
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
   * Agrega un mensaje al historial y lo recorta si excede el máximo.
   * @param {string} phoneNumber Número del cliente.
   * @param {string} role 'user' o 'model'.
   * @param {string} text Contenido del mensaje.
   */
  addToHistory(phoneNumber, role, text) {
    const history = this.getHistory(phoneNumber);
    history.push({
      role,
      parts: [{ text }],
    });

    // Recortar historial si excede el máximo
    if (history.length > this.MAX_HISTORY) {
      history.splice(0, history.length - this.MAX_HISTORY);
    }
    this.conversationHistory.set(phoneNumber, history);
  }

  /**
   * Genera una respuesta de IA para el mensaje del cliente.
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

    if (!this.model) {
      return `¡Hola, ${profileName}! Gracias por escribirnos. En este momento estoy en mantenimiento, pero un agente te atenderá pronto. 🙏`;
    }

    try {
      // Si el usuario escribe palabras de parada explícitas, pausar antes de llamar a la IA
      const cleanInput = userMessage.toLowerCase().trim();
      const explicitTransferKeywords = ['agente', 'asesor', 'humano', 'persona', 'vendedor', 'atencion al cliente', 'atención al cliente'];
      const matchesKeyword = explicitTransferKeywords.some(kw => cleanInput.includes(kw));

      if (matchesKeyword) {
        this.pauseConversation(phoneNumber);
        return `Entendido, ${profileName}. Te estoy comunicando con un asesor en este momento. Por favor espera unos minutos. 🙏`;
      }

      // Agregar contexto del usuario al mensaje
      const contextualMessage = `[Cliente: ${profileName}, Teléfono: ${phoneNumber}]\n${userMessage}`;

      // Obtener historial previo
      const history = this.getHistory(phoneNumber);

      // Crear chat con historial
      const chat = this.model.startChat({
        history: history.length > 0 ? history : undefined,
      });

      // Enviar mensaje y obtener respuesta
      let result = await chat.sendMessage(contextualMessage);
      
      // Manejar llamadas a funciones de catálogo si el modelo lo solicita
      let functionCalls = result.response.functionCalls();
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

        logger.debug({ msg: 'Enviando respuestas de función al modelo', count: functionResponses.length });
        result = await chat.sendMessage(functionResponses);
        functionCalls = result.response.functionCalls();
      }


      const response = result.response.text();


      // Guardar en historial
      this.addToHistory(phoneNumber, 'user', contextualMessage);
      this.addToHistory(phoneNumber, 'model', response);

      logger.info({
        msg: '🧠 Respuesta de Gemini AI generada',
        phoneNumber,
        profileName,
        inputLength: userMessage.length,
        outputLength: response.length,
      });

      // Si la IA respondió diciendo que lo comunicará con un asesor, pausar la conversación
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('comunico con un asesor') || lowerResponse.includes('asesor se pondrá en contacto') || lowerResponse.includes('espera unos minutos')) {
        this.pauseConversation(phoneNumber);
      }

      return response;
    } catch (error) {
      logger.error({
        msg: 'Error al generar respuesta con Gemini AI',
        phoneNumber,
        error: error.message,
      });

      // Respuesta de fallback en caso de error
      return `¡Hola, ${profileName}! Disculpa, estoy teniendo dificultades técnicas en este momento. Por favor, intenta de nuevo en unos minutos o escribe "agente" para hablar con una persona real. 🙏`;
    }
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
      const descModel = this.genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
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

module.exports = new GeminiService();
