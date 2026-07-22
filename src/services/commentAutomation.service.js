const metaGraphService = require('./metaGraph.service');
const messageService = require('./message.service');
const logger = require('../utils/logger');

class CommentAutomationService {
  constructor() {
    this.keywords = [
      'precio', 'precios', 'costo', 'costos', 'cuanto', 'cuánto',
      'info', 'informacion', 'información', 'gorra', 'gorras', 'trucker',
      'catalogo', 'catálogo', 'envio', 'envíos', 'envios', 'interesa',
      'deseo', 'cotizar', 'detalles', 'modelos'
    ];
  }

  /**
   * Procesa un evento entrante de tipo comentario (feed change) proveniente de Meta Ads.
   * @param {object} value Objeto `value` del webhook feed change.
   */
  async handleIncomingComment(value) {
    if (!value || value.item !== 'comment' || value.verb !== 'add') {
      return;
    }

    const commentId = value.comment_id;
    const commentText = (value.message || '').trim();
    const senderName = value.from?.name || 'Cliente Meta Ads';
    const senderId = value.from?.id;

    logger.info({ msg: '💬 Comentario entrante en anuncio de Meta Ads detectado', commentId, senderName, commentText });

    // Detección de intenciones por palabra clave
    const lowerText = commentText.toLowerCase();
    const isTargetComment = this.keywords.some(kw => lowerText.includes(kw)) || commentText.length > 0;

    if (!isTargetComment) {
      logger.debug({ msg: 'Comentario no coincide con palabras clave de intencion comercial', commentText });
      return;
    }

    const firstName = senderName.split(' ')[0] || 'Estimado/a';

    // 1. Respuesta PÚBLICA en el comentario (Estilo ManyChat)
    const publicReplyText = `¡Hola ${firstName}! 👋 Te acabamos de enviar toda la información detallada, fotos de nuestras Gorras Trucker y opciones de pago a tus mensajes privados 📥✨`;
    metaGraphService.replyToCommentPublic(commentId, publicReplyText).catch(err => {
      logger.warn({ msg: 'Aviso al responder públicamente el comentario', commentId, error: err.message });
    });

    // 2. Respuesta PRIVADA (DM) vía Meta Graph API vinculada al comment_id
    const privateReplyText = `👋 ¡Hola ${firstName}! Muchas gracias por tu interés en *Corporación JGIS*. Te enviamos la información completa de nuestras Gorras Trucker personalizadas a través de este chat privado. 🧢📦`;
    metaGraphService.sendPrivateReplyToComment(commentId, privateReplyText).catch(err => {
      logger.warn({ msg: 'Aviso al enviar mensaje privado vinculado al comentario', commentId, error: err.message });
    });

    // 3. Orquestar despacho de la secuencia comercial oficial de JGIS al usuario
    const mockMsg = {
      from: senderId ? `psid_${senderId}` : `comment_${commentId}`,
      id: `comment_event_${commentId}`,
      type: 'text',
      text: { body: commentText }
    };

    const mockVal = {
      contacts: [
        { profile: { name: senderName } }
      ]
    };

    setImmediate(async () => {
      try {
        await messageService.handleIncomingMessage(mockMsg, mockVal);
      } catch (err) {
        logger.error({ msg: 'Error procesando secuencia comercial para comentario', commentId, error: err.message });
      }
    });
  }
}

module.exports = new CommentAutomationService();
