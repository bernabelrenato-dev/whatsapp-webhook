const axios = require('axios');
const config = require('../config/environment');
const logger = require('../utils/logger');

class MetaGraphService {
  /**
   * Resuelve el nombre real de un usuario de Facebook Messenger o Instagram desde Meta Graph API.
   * @param {string} psid Page-Scoped ID del usuario.
   * @returns {Promise<{ firstName: string, lastName: string, fullName: string, profilePic: string|null }|null>}
   */
  async getFacebookProfile(psid) {
    if (!psid || psid.startsWith('chatwoot_conv_')) return null;

    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      logger.debug('No hay ACCESS_TOKEN configurado para Meta Graph API');
      return null;
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${accessToken}`;
      const response = await axios.get(url, { timeout: 5000 });
      const data = response.data;

      if (data && (data.first_name || data.last_name)) {
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        logger.info({ msg: 'Perfil de Facebook resuelto exitosamente desde Meta Graph API', psid, fullName });
        return {
          firstName,
          lastName,
          fullName: fullName || 'Cliente Meta',
          profilePic: data.profile_pic || null
        };
      }
    } catch (error) {
      logger.warn({ msg: 'No se pudo resolver el perfil de Meta Graph API', psid, error: error.message });
    }

    return null;
  }

  /**
   * Actualiza el nombre del contacto en Chatwoot si actualmente es "John Doe" o "Cliente".
   * @param {number|string} contactId ID del contacto en Chatwoot.
   * @param {string} psid Page-Scoped ID del usuario en Facebook/Instagram.
   */
  async resolveAndUpdateChatwootContact(contactId, psid) {
    if (!contactId) return;

    try {
      const chatwootUrl = config.CHATWOOT_API_URL || 'http://chatwoot-web:3000';
      const headers = {
        'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      };

      // 1. Consultar contacto en Chatwoot
      const contactUrl = `${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts/${contactId}`;
      const res = await axios.get(contactUrl, { headers, timeout: 5000 });
      const currentContact = res.data?.payload || res.data;

      const currentName = (currentContact?.name || '').trim();
      const isGenericName = !currentName || currentName.toLowerCase() === 'john doe' || currentName.toLowerCase() === 'cliente';

      if (isGenericName && psid) {
        logger.info({ msg: 'Contacto con nombre genérico detectado en Chatwoot. Resolviendo desde Meta...', contactId, currentName });
        const profile = await this.getFacebookProfile(psid);
        if (profile && profile.fullName && profile.fullName !== 'Cliente Meta') {
          // 2. Actualizar contacto en Chatwoot con el nombre real
          await axios.put(contactUrl, {
            name: profile.fullName
          }, { headers, timeout: 5000 });
          logger.info({ msg: '✅ Contacto actualizado con su nombre real en Chatwoot', contactId, newName: profile.fullName });
        }
      }
    } catch (err) {
      logger.warn({ msg: 'Error resolviendo/actualizando contacto en Chatwoot', contactId, error: err.message });
    }
  }

  /**
   * Envía un mensaje a Facebook Messenger o Instagram Direct con messaging_type "RESPONSE"
   * evitando el error #100 HUMAN_AGENT.
   * @param {string} recipientId PSID del destinatario.
   * @param {string} text Texto del mensaje.
   */
  async sendMessengerResponse(recipientId, text) {
    if (!recipientId || recipientId.startsWith('chatwoot_conv_')) return;

    const accessToken = process.env.ACCESS_TOKEN;
    const pageId = process.env.PHONE_NUMBER_ID;

    if (!accessToken) {
      throw new Error('ACCESS_TOKEN no disponible para Meta Graph API');
    }

    try {
      const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;
      const payload = {
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE', // Usar RESPONSE permitido por Meta en ventana de 24h sin requirir aprobación de HUMAN_AGENT
        message: { text }
      };

      const res = await axios.post(url, payload, { timeout: 5000 });
      logger.info({ msg: 'Mensaje saliente despachado a Messenger con messaging_type RESPONSE', recipientId, messageId: res.data?.message_id });
      return res.data;
    } catch (err) {
      logger.error({ msg: 'Error enviando mensaje por Meta Messenger Graph API', recipientId, error: err.response ? err.response.data : err.message });
      throw err;
    }
  }
}

module.exports = new MetaGraphService();
