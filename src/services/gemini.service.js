/**
 * Servicio de Inteligencia Artificial usando Google Gemini.
 * Gestiona la conversación con contexto y personalidad configurable.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { SYSTEM_PROMPT } = require('../config/botPersonality');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    // Almacén de historial de conversación por número de teléfono (en memoria)
    this.conversationHistory = new Map();
    // Máximo de mensajes de historial por conversación (para no exceder tokens)
    this.MAX_HISTORY = 20;
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
        model: 'gemini-3.1-flash-lite',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 500, // Limitar para WhatsApp (mensajes cortos)
        },
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
    if (!this.conversationHistory.has(phoneNumber)) {
      this.conversationHistory.set(phoneNumber, []);
    }
    return this.conversationHistory.get(phoneNumber);
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
  }

  /**
   * Genera una respuesta de IA para el mensaje del cliente.
   * @param {string} phoneNumber Número del cliente.
   * @param {string} profileName Nombre del perfil del cliente.
   * @param {string} userMessage Mensaje recibido del cliente.
   * @returns {string} Respuesta generada por la IA.
   */
  async generateResponse(phoneNumber, profileName, userMessage) {
    if (!this.model) {
      return `¡Hola, ${profileName}! Gracias por escribirnos. En este momento estoy en mantenimiento, pero un agente te atenderá pronto. 🙏`;
    }

    try {
      // Agregar contexto del usuario al mensaje
      const contextualMessage = `[Cliente: ${profileName}, Teléfono: ${phoneNumber}]\n${userMessage}`;

      // Obtener historial previo
      const history = this.getHistory(phoneNumber);

      // Crear chat con historial
      const chat = this.model.startChat({
        history: history.length > 0 ? history : undefined,
      });

      // Enviar mensaje y obtener respuesta
      const result = await chat.sendMessage(contextualMessage);
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
}

module.exports = new GeminiService();
