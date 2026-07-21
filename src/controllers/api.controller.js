const fs = require('fs');
const path = require('path');
const catalogService = require('../services/catalog.service');
const aiService = require('../services/ai.service');
const logger = require('../utils/logger');

class ApiController {
  async searchProduct(req, res) {
    try {
      const { query, quantity, name, phone } = req.body;
      logger.info({ msg: 'Petición de búsqueda recibida de Typebot', query, quantity, name, phone });

      if (!query) {
        return res.status(400).json({ error: 'Falta el término de búsqueda (query)' });
      }

      // 1. Validar Tipo de Dato y Rango de la Cantidad para evitar cotizaciones erróneas o negativas
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        logger.warn({ msg: 'Cantidad no válida recibida', quantity });
        return res.json({
          success: false,
          message: `Hola ${name || 'cliente'}, por favor ingresa una cantidad numérica entera válida y mayor a cero para poder realizar tu estimación.`,
          imageUrl: '',
          action: 'ask_quantity_again'
        });
      }

      // 2. Límites Comerciales: Desviar volúmenes extremadamente grandes (> 5,000 un)
      if (qty > 5000) {
        logger.info({ msg: 'Pedido excede el límite de cotización automática. Redirigiendo a humano.', quantity: qty });
        return res.json({
          success: false,
          message: `¡Hola ${name || 'cliente'}! Para pedidos superiores a 5,000 unidades, estructuramos planes de descuento preferenciales en fábrica. En este momento te transferiré con un asesor comercial para darte una oferta a tu medida.`,
          imageUrl: '',
          action: 'handover'
        });
      }

      // 3. Buscar en el catálogo local (base de datos PostgreSQL)
      const results = await catalogService.searchCatalog(query);

      if (results.length === 0) {
        logger.info({ msg: 'Búsqueda de producto sin resultados. Transfiriendo a humano.', query });
        return res.json({
          success: false,
          message: `Hola ${name || 'cliente'}, no he podido encontrar un producto exacto en nuestro catálogo con el término "${query}". \n\nNo te preocupes, en este momento te comunicaré con un asesor de ventas para que te asista de forma personalizada.`,
          imageUrl: '',
          action: 'handover'
        });
      }

      // Tomamos el primer resultado como coincidencia principal
      const product = results[0];
      
      // Determinar precio según escala
      let precioUnitarioText = 'No disponible';

      if (qty >= 1 && qty <= 5) {
        precioUnitarioText = product.precios_venta_sin_igv.precio_1_5_unidades;
      } else if (qty >= 6 && qty <= 12) {
        precioUnitarioText = product.precios_venta_sin_igv.precio_6_12_unidades;
      } else if (qty >= 13 && qty <= 50) {
        precioUnitarioText = product.precios_venta_sin_igv.precio_13_50_unidades;
      } else if (qty >= 51 && qty <= 499) {
        precioUnitarioText = product.precios_venta_sin_igv.precio_51_499_unidades;
      } else {
        precioUnitarioText = product.precios_venta_sin_igv.precio_500_1000_unidades;
      }

      // Limpiar el texto del precio (remover 'S/ ' y parsear float)
      let priceValue = 0;
      if (precioUnitarioText && precioUnitarioText !== 'No disponible') {
        priceValue = parseFloat(precioUnitarioText.replace('S/ ', '').trim());
      }

      const totalEstimated = priceValue * qty;
      const formattedTotal = totalEstimated > 0 ? `S/ ${totalEstimated.toFixed(2)}` : 'Consultar';

      // Usar el link de la imagen resuelto por el catalogService o fallback dinámico
      let imageUrl = product.link_imagen !== 'No disponible' ? product.link_imagen : '';
      if (!imageUrl && product.codigo) {
        const cleanCodeForFile = product.codigo.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9_-]/g, '');
        try {
          const imagesDir = path.join(__dirname, '..', 'public', 'images');
          if (fs.existsSync(imagesDir)) {
            const files = await fs.promises.readdir(imagesDir);
            const matchingFile = files.find(f => {
              const baseName = path.basename(f, path.extname(f)).toUpperCase();
              return baseName === cleanCodeForFile;
            });
            
            if (matchingFile) {
              let baseUrl = process.env.PUBLIC_URL;
              if (!baseUrl) {
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const reqHost = req.headers.host || 'bot.jgispublicidad.pe';
                baseUrl = `${protocol}://${reqHost}`;
              }
              
              if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1);
              }
              
              imageUrl = `${baseUrl}/images/${matchingFile}`;
            }
          }
        } catch (err) {
          logger.error({ msg: 'Error buscando imagen del producto', error: err.message });
        }
      }

      const message = `¡Hola ${name || 'cliente'}! Encontré este producto para ti:\n\n` +
        `📦 *${product.nombre}*\n` +
        `🔢 *Código:* ${product.codigo}\n` +
        `🎨 *Color:* ${product.color || 'Varios colores'}\n` +
        `📂 *Categoría:* ${product.categoria}\n\n` +
        `📝 *Descripción:* ${product.descripcion}\n\n` +
        `💰 *Cotización estimada para ${qty} unidades:*\n` +
        `• Precio Unitario: ${precioUnitarioText} (sin IGV)\n` +
        `• *Total Estimado:* ${formattedTotal} (sin IGV)\n\n` +
        `¿Te interesa este modelo o deseas ver otras opciones? *Valentina Rios* 👩‍💼`;

      logger.info({ msg: 'Búsqueda exitosa, enviando respuesta a Typebot', codigo: product.codigo, total: formattedTotal });

      return res.json({
        success: true,
        message,
        imageUrl,
        action: 'continue'
      });
    } catch (error) {
      logger.error({ msg: 'Error en controlador api.search', error: error.message });
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Nuevo método para procesar el traspaso manual solicitado desde Typebot
  async triggerHandover(req, res) {
    try {
      const { phone, name, reason } = req.body;
      logger.info({ msg: 'Petición de traspaso a humano recibida desde Webhook de Typebot', phone, name, reason });

      if (!phone) {
        return res.status(400).json({ error: 'Falta el número de teléfono del cliente (phone)' });
      }

      // Pausar de inmediato el bot para este número telefónico
      aiService.pauseConversation(phone);

      logger.info({ msg: 'Conversación pausada exitosamente. Valentina en espera.', phone, cliente: name });

      return res.json({
        success: true,
        message: 'Traspaso completado. Respuestas automáticas pausadas.'
      });
  // Método para generar conversaciones de prueba en bandejas de WhatsApp y Messenger
  async createTestChats(req, res) {
    try {
      const axios = require('axios');
      const config = require('../config/environment');
      const chatwootUrl = config.CHATWOOT_API_URL || 'http://chatwoot-web:3000';
      const headers = {
        'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      };

      const inboxesRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/inboxes`, { headers });
      const rawInboxes = inboxesRes.data;
      const inboxes = Array.isArray(rawInboxes) ? rawInboxes : (rawInboxes.payload || []);

      let whatsappInbox = inboxes.find(ib => ib.channel_type === 'Channel::Whatsapp' || ib.channel_type === 'Channel::Api' || ib.name.toLowerCase().includes('whatsapp'));
      let messengerInbox = inboxes.find(ib => ib.channel_type === 'Channel::FacebookPage' || ib.channel_type === 'Channel::Facebook' || ib.name.toLowerCase().includes('corporación') || ib.name.toLowerCase().includes('meta'));

      if (!whatsappInbox && inboxes.length > 0) whatsappInbox = inboxes[0];
      if (!messengerInbox && inboxes.length > 1) messengerInbox = inboxes[1] || inboxes[0];

      // Contact 1: WhatsApp
      let waContactId;
      try {
        const waRes = await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts`, {
          name: 'Prueba WhatsApp (Cliente Test)',
          phone_number: '+51999888777'
        }, { headers });
        waContactId = waRes.data.payload ? waRes.data.payload.contact.id : waRes.data.id;
      } catch (e) {
        const searchRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts/search?q=51999888777`, { headers });
        const rawFound = searchRes.data.payload || searchRes.data;
        const found = Array.isArray(rawFound) ? rawFound[0] : rawFound;
        if (found) waContactId = found.id;
      }

      // Contact 2: Messenger
      let msgContactId;
      try {
        const msgRes = await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts`, {
          name: 'Prueba Messenger (Cliente Test)',
          email: 'prueba.messenger@jgispublicidad.pe'
        }, { headers });
        msgContactId = msgRes.data.payload ? msgRes.data.payload.contact.id : msgRes.data.id;
      } catch (e) {
        const searchRes = await axios.get(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/contacts/search?q=prueba.messenger`, { headers });
        const rawFound = searchRes.data.payload || searchRes.data;
        const found = Array.isArray(rawFound) ? rawFound[0] : rawFound;
        if (found) msgContactId = found.id;
      }

      const created = [];

      if (whatsappInbox && waContactId) {
        const waConvRes = await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, {
          source_id: `wa_test_${Date.now()}`,
          inbox_id: whatsappInbox.id,
          contact_id: waContactId
        }, { headers });
        const waConvId = waConvRes.data.id;

        await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${waConvId}/messages`, {
          content: '¡Hola! Quisiera cotizar 100 gorras trucker personalizadas con el logo de mi empresa.',
          message_type: 'incoming'
        }, { headers });

        created.push({ channel: 'WhatsApp', inbox: whatsappInbox.name, conversationId: waConvId });
      }

      if (messengerInbox && msgContactId) {
        const msgConvRes = await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations`, {
          source_id: `msg_test_${Date.now()}`,
          inbox_id: messengerInbox.id,
          contact_id: msgContactId
        }, { headers });
        const msgConvId = msgConvRes.data.id;

        await axios.post(`${chatwootUrl}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${msgConvId}/messages`, {
          content: '¿Hacen envíos a todo el Perú y cuánto tardan las tazas publicitarias?',
          message_type: 'incoming'
        }, { headers });

        created.push({ channel: 'Messenger', inbox: messengerInbox.name, conversationId: msgConvId });
      }

      return res.json({ success: true, message: 'Chats de prueba generados exitosamente en Chatwoot', created });
    } catch (error) {
      logger.error({ msg: 'Error en controlador api.createTestChats', error: error.message });
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ApiController();
