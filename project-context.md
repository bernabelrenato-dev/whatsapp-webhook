This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where line numbers have been added.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: node_modules/**, .git/**, src/public/images/**, scratch/**, .agents/**, src/config/catalog.json, package-lock.json, repomix-output.xml, project-context.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  config/
    botPersonality.js
    environment.js
  controllers/
    chatwoot.controller.js
    webhook.controller.js
  middleware/
    errorHandler.js
    signatureValidator.js
  routes/
    webhook.routes.js
  services/
    catalog.service.js
    gemini.service.js
    message.service.js
    queue.service.js
  utils/
    logger.js
  app.js
  server.js
.env.example
.gitignore
package.json
repomix.config.json
tunnel.js
```

# Files

## File: src/config/botPersonality.js
```javascript
 1: /**
 2:  * Personalidad y entrenamiento del bot de WhatsApp (JGIS Publicidad).
 3:  * Basado en la web oficial y en el historial real de conversaciones con clientes.
 4:  */
 5: 
 6: const SYSTEM_PROMPT = `
 7: Eres el asistente virtual oficial de **JGIS Publicidad** (Corporación Jgis), una empresa peruana líder en merchandising y artículos publicitarios personalizados.
 8: Tu nombre es **Valentina Rios** y respondes por WhatsApp a clientes interesados en cotizar productos publicitarios al por mayor.
 9: 
10: Tu objetivo es atender amablemente, brindar información sobre nuestro catálogo, recopilar los datos mínimos del pedido y transferir la conversación a un asesor humano de ventas para que envíe la cotización formal por correo o WhatsApp.
11: 
12: ═══════════════════════════════════════
13: REGLAS DE BÚSQUEDA Y PRECIOS (CATÁLOGO)
14: ═══════════════════════════════════════
15: 1. **Búsqueda Obligatoria**: Tienes la herramienta \`searchCatalog\` para buscar productos. Debes usarla obligatoriamente siempre que el cliente pregunte por un artículo, stock, colores o precios.
16: 2. **Presentación de Opciones**: Si el cliente hace una consulta general (ej: "tazas", "tomatodos"), busca en el catálogo y preséntale amigablemente hasta 3 o 4 opciones diferentes (mencionando nombre y código). Pregúntale cuál de ellas le gusta más para darle el precio.
17: 3. **Escalas de Precios de Venta**: El catálogo calcula y te devuelve los precios unitarios finales de venta con las siguientes escalas de margen ya aplicadas:
18:    - Rango de 1 a 5 unidades (aumento del 85% de costo)
19:    - Rango de 6 a 12 unidades (aumento del 40% de costo)
20:    - Rango de 13 a 50 unidades (aumento del 35% de costo)
21:    - Rango de 51 a 499 unidades (aumento del 25% de costo)
22:    - Rango de 500 a 1000 unidades (aumento del 20% de costo)
23:    Menciona los precios unitarios según el volumen que interese al cliente. Si no menciona cantidad, dale un par de precios de referencia (ej: precio de 13 a 50 unidades y precio para 500+).
24: 4. **IGV y Personalización**:
25:    - Aclara siempre al cliente que **los precios no incluyen IGV (18%)**.
26:    - Explica que el precio indicado es por el producto en blanco. El costo de la personalización (impresión, grabado láser o serigrafía) lo calculará el asesor de ventas según el logo del cliente.
27: 5. **Imágenes de Productos**: El catálogo te devolverá un campo llamado \`link_imagen\`. Si el enlace está disponible (es decir, no dice "No disponible"), debes incluirlo obligatoriamente al final de tu respuesta de esta forma:
28:    📷 Imagen referencial: [link_imagen]
29: 
30: 
31: 
32: ═══════════════════════════════════════
33: REGLAS DE COMUNICACIÓN EN WHATSAPP
34: ═══════════════════════════════════════
35: 1. **Sé breve y directo**: Los clientes leen desde el móvil. No escribas textos largos ni correos estructurados. Usa párrafos de máximo 2 o 3 líneas.
36: 2. **Tono amable y profesional**: Usa emojis amigables (máximo 2 por mensaje). Saluda de forma cálida (ej. "Hola [Nombre], buenas tardes. Sí, coméntame, ¿en qué producto estás interesado?").
37: 3. **Formato limpio**: Evita usar negritas excesivas, listas complejas o formatos que puedan verse mal en WhatsApp.
38: 4. **Área de operación**: Estamos en Lima, Perú. Hacemos envíos locales (Miraflores, Surco, San Isidro, etc.) mediante motorizados y envíos a nivel nacional.
39: 
40: ═══════════════════════════════════════
41: CATÁLOGO DE PRODUCTOS (JGIS PUBLICIDAD)
42: ═══════════════════════════════════════
43: Todos nuestros productos se personalizan con el logo o diseño de la empresa del cliente. Vendemos principalmente al por mayor:
44: 
45: - **Tazas y Mugs**: Taza ecológica de trigo, mug de cerámica con base de corcho, mug de vidrio y fibra de trigo, mug con sujetador/soporte para celular.
46: - **Bolsas y Mochilas**: Bolsas de tocuyo con logo, bolsas ecológicas de cambre, mochilas publicitarias.
47: - **Papelería y Oficina**: Libretas personalizadas (con hojas rayadas y logo al pie de página), cuadernos corporativos, lapiceros publicitarios (plástico, metal o ecológicos), blocks de notas A5.
48: - **Impresiones rápidas**: Flyers/volantes (A4, A5, papel couche de 150gr o 200gr, mate o brillo, tira y retira), tarjetas de presentación (8x5 cm, couche de 200gr o 300gr).
49: - **Otros**: Sellos automáticos personalizados, llaveros, tomatodos deportivos, termos, gorras y polos publicitarios.
50: 
51: ═══════════════════════════════════════
52: INFORMACIÓN DE ENTREGA Y COTIZACIONES
53: ═══════════════════════════════════════
54: - **Tiempos de entrega**:
55:   - Impresiones rápidas (tarjetas, flyers, stickers): 24 a 48 horas una vez aprobado el diseño.
56:   - Merchandising (libretas, bolsas, lapiceros): 7 días hábiles (dependiendo de la cantidad).
57: - **Para enviar una cotización formal necesitamos**:
58:   1. Nombre del contacto y empresa.
59:   2. Producto de interés y cantidad (ej. 150 unidades).
60:   3. Correo electrónico para enviar la propuesta en PDF.
61:   4. Si tienen el diseño o logo listo en formato de curvas (Illustrator .ai o PDF).
62: 
63: ═══════════════════════════════════════
64: EJEMPLOS DE CONVERSACIÓN (ENTRENAMIENTO)
65: ═══════════════════════════════════════
66: 
67: *Ejemplo 1 (Consulta de tazas)*:
68: Cliente: "Hola, ¿tienen tomatodos de metal?"
69: Bot: *(Llama a searchCatalog con query: "tomatodo metal")*
70: Bot: "Hola, buenas tardes. ¡Sí, contamos con tomatodos metálicos! Por ejemplo, tenemos el Tomatodo Metálico de Aluminio (FXSB-500C) de 540ml en color azul y otros tonos. El precio a partir de 50 unidades es de S/ 7.30 c/u (precio no incluye IGV ni logo). ¿Qué cantidad tenías pensado cotizar?"
71: 
72: *Ejemplo 2 (Pedido urgente)*:
73: Cliente: "Necesito 300 flyers A5 en couche para mañana en la tarde, ¿se puede?"
74: Bot: "Hola. Sí, es posible tener las impresiones de flyers para mañana en la tarde. Por favor, compártenos el diseño por aquí o al correo ventas@jgispublicidad.com y confírmanos tu correo electrónico para enviarte la cotización formal de inmediato."
75: 
76: *Ejemplo 3 (Transferencia a humano)*:
77: Cliente: "Quiero hablar con un asesor o ver un tema de un pedido que ya está en camino."
78: Bot: "Comprendo. En este momento te transfiero con uno de nuestros asesores de atención al cliente para que te ayude directamente. Por favor, aguarda un momento en este chat. 🙏"
79: `;
80: 
81: module.exports = { SYSTEM_PROMPT };
```

## File: src/config/environment.js
```javascript
 1: require('dotenv').config();
 2: const logger = require('../utils/logger');
 3: 
 4: const environment = {
 5:   PORT: parseInt(process.env.PORT || '3000', 10),
 6:   NODE_ENV: process.env.NODE_ENV || 'development',
 7:   VERIFY_TOKEN: process.env.VERIFY_TOKEN,
 8:   APP_SECRET: process.env.APP_SECRET,
 9:   ACCESS_TOKEN: process.env.ACCESS_TOKEN,
10:   PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
11:   CHATWOOT_API_URL: process.env.CHATWOOT_API_URL || 'https://app.chatwoot.com',
12:   CHATWOOT_ACCESS_TOKEN: process.env.CHATWOOT_ACCESS_TOKEN,
13:   CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID,
14: };
15: 
16: // Validaciones al arrancar
17: if (!environment.VERIFY_TOKEN) {
18:   logger.warn('La variable VERIFY_TOKEN no está configurada en .env. La verificación de Meta fallará.');
19: }
20: 
21: if (!environment.APP_SECRET && environment.NODE_ENV === 'production') {
22:   logger.error('CRÍTICO: APP_SECRET no está configurada en producción. Las firmas no podrán ser verificadas.');
23: }
24: 
25: module.exports = environment;
```

## File: src/controllers/chatwoot.controller.js
```javascript
 1: const logger = require('../utils/logger');
 2: const geminiService = require('../services/gemini.service');
 3: const messageService = require('../services/message.service');
 4: 
 5: /**
 6:  * Recibe y procesa los eventos de Webhook enviados por Chatwoot
 7:  */
 8: exports.receiveChatwootMessage = async (req, res, next) => {
 9:   try {
10:     const payload = req.body;
11: 
12:     logger.debug({
13:       msg: 'Carga útil del webhook de Chatwoot recibida',
14:       event: payload.event,
15:       message_type: payload.message_type
16:     });
17: 
18:     if (payload.event === 'message_created') {
19:       const conversationId = payload.conversation.id;
20:       const messageType = payload.message_type;
21:       const messageId = payload.id;
22: 
23:       // Obtener el número de teléfono del contacto como identificador único
24:       const contact = payload.contact || payload.sender || (payload.conversation && payload.conversation.contact);
25:       const from = contact ? (contact.phone_number || contact.id.toString()) : 'unknown';
26:       const profileName = contact ? (contact.name || 'Cliente') : 'Cliente';
27: 
28: 
29:       if (messageType === 'incoming') {
30:         const body = payload.content;
31:         logger.info(`💬 Mensaje entrante de Chatwoot de [${profileName}] (${from}): "${body}"`);
32: 
33:         // Encolar asíncronamente para liberar rápido la respuesta HTTP
34:         setImmediate(async () => {
35:           try {
36:             // Verificar si el bot está pausado para esta conversación
37:             if (geminiService.isConversationPaused(from)) {
38:               logger.info(`⏸️ Conversación con ${profileName} (${from}) está pausada. Bot no responderá.`);
39:               return;
40:             }
41: 
42:             // Generar respuesta con Gemini AI
43:             let aiResponse = await geminiService.generateResponse(from, profileName, body);
44:             if (aiResponse) {
45:               // Extraer enlace de imagen si existe y limpiarlo de la respuesta de texto
46:               const regex = /📷\s*Imagen\s*(?:referencial)?:\s*https:\/\/whatsapp-webhook-bilg\.onrender\.com\/images\/([A-Za-z0-9_-]+\.[A-Za-z]+)/;
47:               const match = aiResponse.match(regex);
48:               let imageFileName = null;
49: 
50:               if (match) {
51:                 imageFileName = match[1];
52:                 // Quitar el texto del enlace para que se envíe como archivo adjunto nativo
53:                 aiResponse = aiResponse.replace(/📷\s*Imagen\s*(?:referencial)?:\s*https:\/\/whatsapp-webhook-bilg\.onrender\.com\/images\/[A-Za-z0-9_-]+\.[A-Za-z]+/, '').trim();
54:               }
55: 
56:               await messageService.sendChatwootMessage(conversationId, aiResponse, imageFileName);
57:             }
58: 
59:           } catch (err) {
60:             logger.error({
61:               msg: 'Error procesando respuesta de Gemini para Chatwoot',
62:               error: err.message
63:             });
64:           }
65:         });
66: 
67:       } else if (messageType === 'outgoing') {
68:         // Si es un mensaje saliente, verificar si fue enviado por nuestro bot
69:         if (messageService.botSentMessageIds.has(messageId)) {
70:           // Fue el bot, removemos el ID y no pausamos
71:           messageService.botSentMessageIds.delete(messageId);
72:         } else {
73:           // Fue un humano desde la interfaz de Chatwoot, pausamos el bot por 2 horas
74:           logger.info(`👤 Mensaje manual de agente detectado en Chatwoot para ${profileName} (${from}). Pausando bot.`);
75:           geminiService.pauseConversation(from);
76:         }
77:       }
78:     }
79: 
80:     return res.status(200).json({ success: true });
81:   } catch (error) {
82:     next(error);
83:   }
84: };
```

## File: src/controllers/webhook.controller.js
```javascript
 1: const logger = require('../utils/logger');
 2: const config = require('../config/environment');
 3: const queueService = require('../services/queue.service');
 4: 
 5: /**
 6:  * Controlador de peticiones para los endpoints del Webhook de WhatsApp
 7:  */
 8: 
 9: /**
10:  * Maneja la verificación inicial del Webhook por parte de Meta (GET /webhook)
11:  */
12: exports.verifyWebhook = (req, res) => {
13:   const mode = req.query['hub.mode'];
14:   const token = req.query['hub.verify_token'];
15:   const challenge = req.query['hub.challenge'];
16: 
17:   logger.debug({
18:     msg: 'Petición de verificación del webhook recibida (GET)',
19:     query: req.query,
20:   });
21: 
22:   if (mode && token) {
23:     if (mode === 'subscribe' && token === config.VERIFY_TOKEN) {
24:       logger.info('¡Verificación del Webhook exitosa! Token verificado.');
25:       // Importante: Responder con el challenge en texto plano
26:       return res.status(200).send(challenge);
27:     } else {
28:       logger.warn({
29:         msg: 'Fallo en verificación del webhook: Tokens no coinciden.',
30:         tokenRecibido: token,
31:       });
32:       return res.status(403).json({ error: 'Token de verificación incorrecto' });
33:     }
34:   }
35: 
36:   logger.warn('Petición de verificación malformada.');
37:   return res.status(400).json({ error: 'Parámetros insuficientes' });
38: };
39: 
40: /**
41:  * Recibe los eventos de mensajería en tiempo real de Meta (POST /webhook)
42:  */
43: exports.receiveMessage = async (req, res, next) => {
44:   try {
45:     const payload = req.body;
46: 
47:     logger.debug({
48:       msg: 'Carga útil del webhook recibida',
49:       payload,
50:     });
51: 
52:     // Validamos que el objeto sea el esperado de WhatsApp Business
53:     if (payload.object === 'whatsapp_business_account') {
54:       // Encolamos de forma asíncrona para liberar inmediatamente el ciclo HTTP
55:       const job = await queueService.addJob('process-whatsapp-payload', payload);
56:       
57:       logger.debug({ msg: 'Mensaje encolado', jobId: job.id });
58: 
59:       // Retornar 200 OK inmediatamente (Meta exige respuesta rápida)
60:       return res.status(200).send('EVENT_RECEIVED');
61:     }
62: 
63:     // Si no es un evento de whatsapp_business_account, se retorna 404
64:     logger.warn({
65:       msg: 'Carga útil recibida no válida (campo object no coincide)',
66:       object: payload.object,
67:     });
68:     return res.status(404).send();
69:   } catch (error) {
70:     next(error);
71:   }
72: };
```

## File: src/middleware/errorHandler.js
```javascript
 1: const logger = require('../utils/logger');
 2: 
 3: module.exports = function errorHandler(err, req, res, next) {
 4:   logger.error({
 5:     msg: 'Error no controlado capturado por el middleware',
 6:     err: {
 7:       message: err.message,
 8:       stack: err.stack,
 9:     },
10:     path: req.path,
11:     method: req.method,
12:   });
13: 
14:   const statusCode = err.statusCode || err.status || 500;
15:   
16:   res.status(statusCode).json({
17:     error: {
18:       message: process.env.NODE_ENV === 'production' 
19:         ? 'Error interno del servidor' 
20:         : err.message,
21:       status: statusCode,
22:     }
23:   });
24: };
```

## File: src/middleware/signatureValidator.js
```javascript
 1: const crypto = require('crypto');
 2: const config = require('../config/environment');
 3: const logger = require('../utils/logger');
 4: 
 5: module.exports = function verifyWhatsAppSignature(req, res, next) {
 6:   // En desarrollo local sin APP_SECRET configurado, omitimos por comodidad de pruebas
 7:   if (config.NODE_ENV === 'development' && !config.APP_SECRET) {
 8:     logger.warn('Omitiendo validación de firma en entorno de desarrollo local.');
 9:     return next();
10:   }
11: 
12:   const signature = req.headers['x-hub-signature-256'];
13:   if (!signature) {
14:     logger.error('Petición rechazada: Falta firma X-Hub-Signature-256 en cabeceras.');
15:     return res.status(401).json({ error: 'Firma requerida' });
16:   }
17: 
18:   const parts = signature.split('=');
19:   if (parts.length !== 2 || parts[0] !== 'sha256') {
20:     logger.error('Petición rechazada: Formato de firma inválido.');
21:     return res.status(400).json({ error: 'Formato de firma inválido' });
22:   }
23: 
24:   const signatureHash = parts[1];
25:   
26:   const expectedHash = crypto
27:     .createHmac('sha256', config.APP_SECRET)
28:     .update(req.rawBody || '')
29:     .digest('hex');
30: 
31:   if (signatureHash !== expectedHash) {
32:     logger.error('Petición rechazada: La firma HMAC SHA256 no coincide.');
33:     return res.status(401).json({ error: 'Firma inválida' });
34:   }
35: 
36:   logger.debug('Firma del Webhook verificada correctamente.');
37:   next();
38: };
```

## File: src/routes/webhook.routes.js
```javascript
 1: const express = require('express');
 2: const router = express.Router();
 3: const webhookController = require('../controllers/webhook.controller');
 4: const chatwootController = require('../controllers/chatwoot.controller');
 5: const verifyWhatsAppSignature = require('../middleware/signatureValidator');
 6: 
 7: // Ruta de verificación (GET)
 8: router.get('/', webhookController.verifyWebhook);
 9: 
10: // Ruta de recepción de mensajes (POST) - Protegida con el validador de firmas
11: router.post('/', verifyWhatsAppSignature, webhookController.receiveMessage);
12: 
13: // Ruta de recepción de mensajes de Chatwoot (POST)
14: router.post('/chatwoot-webhook', chatwootController.receiveChatwootMessage);
15: 
16: module.exports = router;
```

## File: src/services/catalog.service.js
```javascript
  1: const catalog = require('../config/catalog.json');
  2: const logger = require('../utils/logger');
  3: 
  4: class CatalogService {
  5:   /**
  6:    * Realiza una búsqueda de palabras clave en el catálogo consolidado de productos.
  7:    * @param {string} query Término de búsqueda de producto.
  8:    * @returns {Array} Listado de hasta 5 productos que coincidan.
  9:    */
 10:   /**
 11:    * Calcula los precios de venta al público aplicando el margen de JGIS
 12:    * en base a los precios de costo del Excel.
 13:    */
 14:   calculateSellingPrices(item) {
 15:     const cost_500 = item.price_500;
 16:     const cost_50 = item.price_50 || cost_500;
 17:     const cost_1 = item.price_1 || cost_50 || cost_500;
 18: 
 19:     return {
 20:       precio_1_5_unidades: cost_1 ? `S/ ${(cost_1 * 1.85).toFixed(2)}` : 'No disponible',
 21:       precio_6_12_unidades: cost_1 ? `S/ ${(cost_1 * 1.40).toFixed(2)}` : 'No disponible',
 22:       precio_13_50_unidades: cost_50 ? `S/ ${(cost_50 * 1.35).toFixed(2)}` : 'No disponible',
 23:       precio_51_499_unidades: cost_50 ? `S/ ${(cost_50 * 1.25).toFixed(2)}` : 'No disponible',
 24:       precio_500_1000_unidades: cost_500 ? `S/ ${(cost_500 * 1.20).toFixed(2)}` : 'No disponible'
 25:     };
 26:   }
 27: 
 28:   /**
 29:    * Realiza una búsqueda de palabras clave en el catálogo consolidado de productos.
 30:    * @param {string} query Término de búsqueda de producto.
 31:    * @returns {Array} Listado de hasta 5 productos que coincidan con sus precios de venta calculados.
 32:    */
 33:   searchCatalog(query) {
 34:     if (!query || typeof query !== 'string') return [];
 35:     
 36:     logger.debug({ msg: 'Buscando en catálogo de precios', query });
 37:     
 38:     // Normalizar la consulta (quitar tildes, minúsculas, espacios)
 39:     const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
 40:     
 41:     if (cleanQuery.length < 2) return [];
 42: 
 43:     let results = [];
 44: 
 45:     // 1. Intentar buscar por coincidencia exacta de código de producto (ej. "MUG-39")
 46:     const codeMatches = catalog.filter(item => {
 47:       const code = (item.code || '').toLowerCase().trim();
 48:       return code === cleanQuery || code.includes(cleanQuery);
 49:     });
 50: 
 51:     if (codeMatches.length > 0) {
 52:       logger.info({ msg: 'Coincidencia de código encontrada', count: codeMatches.length, query });
 53:       results = codeMatches.slice(0, 5);
 54:     } else {
 55:       // 2. Coincidencia por palabras clave en nombre, descripción y categoría
 56:       const words = cleanQuery.split(/\s+/).filter(w => w.length >= 2);
 57:       if (words.length > 0) {
 58:         const scoreMatches = catalog.map(item => {
 59:           const name = (item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
 60:           const desc = (item.description || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
 61:           const category = (item.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
 62: 
 63:           let score = 0;
 64:           words.forEach(word => {
 65:             if (name.includes(word)) score += 5; // Mayor peso al nombre
 66:             if (category.includes(word)) score += 3; // Peso medio a la categoría
 67:             if (desc.includes(word)) score += 1; // Menor peso a la descripción
 68:           });
 69: 
 70:           return { item, score };
 71:         });
 72: 
 73:         results = scoreMatches
 74:           .filter(m => m.score > 0)
 75:           .sort((a, b) => b.score - a.score)
 76:           .map(m => m.item)
 77:           .slice(0, 6);
 78:       }
 79:     }
 80: 
 81:     // Mapear resultados agregando los precios calculados
 82:     const processedResults = results.map(item => {
 83:       const prices = this.calculateSellingPrices(item);
 84:       return {
 85:         codigo: item.code,
 86:         nombre: item.name,
 87:         descripcion: item.description,
 88:         color: item.color,
 89:         stock: item.stock,
 90:         categoria: item.category,
 91:         precios_venta_sin_igv: prices,
 92:         link_imagen: item.image ? `https://whatsapp-webhook-bilg.onrender.com/images/${item.image}` : 'No disponible'
 93:       };
 94:     });
 95: 
 96: 
 97:     logger.info({ msg: 'Resultados de búsqueda de catálogo procesados', count: processedResults.length, query });
 98:     return processedResults;
 99:   }
100: }
101: 
102: 
103: module.exports = new CatalogService();
```

## File: src/services/gemini.service.js
```javascript
  1: /**
  2:  * Servicio de Inteligencia Artificial usando Google Gemini.
  3:  * Gestiona la conversación con contexto y personalidad configurable.
  4:  */
  5: const { GoogleGenerativeAI } = require('@google/generative-ai');
  6: const logger = require('../utils/logger');
  7: const { SYSTEM_PROMPT } = require('../config/botPersonality');
  8: const catalogService = require('./catalog.service');
  9: 
 10: 
 11: class GeminiService {
 12:   constructor() {
 13:     this.genAI = null;
 14:     this.model = null;
 15:     // Almacén de historial de conversación por número de teléfono
 16:     this.conversationHistory = new Map();
 17:     // Almacén de números pausados (para traspaso a humanos). Clave: número, Valor: timestamp expiración
 18:     this.pausedConversations = new Map();
 19:     this.MAX_HISTORY = 20;
 20:     // Duración de la pausa por defecto (2 horas en milisegundos)
 21:     this.DEFAULT_PAUSE_DURATION = 2 * 60 * 60 * 1000;
 22:   }
 23: 
 24:   /**
 25:    * Pausa las respuestas automáticas del bot para un número de teléfono.
 26:    * @param {string} phoneNumber Número del cliente.
 27:    * @param {number} durationMs Duración de la pausa en milisegundos.
 28:    */
 29:   pauseConversation(phoneNumber, durationMs = this.DEFAULT_PAUSE_DURATION) {
 30:     const expiration = Date.now() + durationMs;
 31:     this.pausedConversations.set(phoneNumber, expiration);
 32:     logger.info(`⏸️ Respuestas del bot pausadas para ${phoneNumber} hasta las ${new Date(expiration).toLocaleTimeString()}`);
 33:   }
 34: 
 35:   /**
 36:    * Verifica si la conversación con un número está actualmente pausada.
 37:    * @param {string} phoneNumber Número del cliente.
 38:    * @returns {boolean} True si está pausada.
 39:    */
 40:   isConversationPaused(phoneNumber) {
 41:     if (!this.pausedConversations.has(phoneNumber)) {
 42:       return false;
 43:     }
 44:     const expiration = this.pausedConversations.get(phoneNumber);
 45:     if (Date.now() > expiration) {
 46:       this.pausedConversations.delete(phoneNumber); // Expiró, limpiar
 47:       logger.info(`▶️ Pausa expirada. Bot reactivado para ${phoneNumber}`);
 48:       return false;
 49:     }
 50:     return true;
 51:   }
 52: 
 53:   /**
 54:    * Despausa inmediatamente una conversación.
 55:    * @param {string} phoneNumber Número del cliente.
 56:    */
 57:   unpauseConversation(phoneNumber) {
 58:     if (this.pausedConversations.has(phoneNumber)) {
 59:       this.pausedConversations.delete(phoneNumber);
 60:       logger.info(`▶️ Bot reactivado manualmente para ${phoneNumber}`);
 61:     }
 62:   }
 63: 
 64:   /**
 65:    * Inicializa el cliente de Gemini con la API Key.
 66:    */
 67:   initialize() {
 68:     const apiKey = process.env.GEMINI_API_KEY;
 69:     if (!apiKey) {
 70:       logger.warn('GEMINI_API_KEY no configurada. El bot responderá con mensajes predeterminados.');
 71:       return false;
 72:     }
 73: 
 74:     try {
 75:       this.genAI = new GoogleGenerativeAI(apiKey);
 76:       this.model = this.genAI.getGenerativeModel({
 77:         model: 'gemini-3.1-flash-lite',
 78:         systemInstruction: SYSTEM_PROMPT,
 79:         generationConfig: {
 80:           temperature: 0.7,
 81:           topP: 0.9,
 82:           topK: 40,
 83:           maxOutputTokens: 500, // Limitar para WhatsApp (mensajes cortos)
 84:         },
 85:         tools: [{
 86:           functionDeclarations: [
 87:             {
 88:               name: 'searchCatalog',
 89:               description: 'Busca productos en el catálogo consolidado de JGIS Publicidad. Retorna el código de producto, nombre, descripción, stock, color, procedencia (origen) y escala de precios (precio unitario para 500+ unidades, 50+ unidades y 1-49 unidades). Debe usarse obligatoriamente siempre que el cliente solicite precios, cotizaciones, stock, colores, o pregunte si contamos con algún artículo de merchandising.',
 90:               parameters: {
 91:                 type: 'OBJECT',
 92:                 properties: {
 93:                   query: {
 94:                     type: 'STRING',
 95:                     description: 'Término de búsqueda del producto (ej: "taza", "tomatodo metal", "bolsa notex")',
 96:                   },
 97:                 },
 98:                 required: ['query'],
 99:               },
100:             },
101:           ],
102:         }],
103:       });
104: 
105:       logger.info('🧠 Servicio de Gemini AI inicializado correctamente.');
106:       return true;
107:     } catch (error) {
108:       logger.error({ msg: 'Error al inicializar Gemini AI', error: error.message });
109:       return false;
110:     }
111:   }
112: 
113:   /**
114:    * Obtiene o crea el historial de conversación para un número.
115:    * @param {string} phoneNumber Número del cliente.
116:    * @returns {Array} Historial de mensajes.
117:    */
118:   getHistory(phoneNumber) {
119:     if (!this.conversationHistory.has(phoneNumber)) {
120:       this.conversationHistory.set(phoneNumber, []);
121:     }
122:     return this.conversationHistory.get(phoneNumber);
123:   }
124: 
125:   /**
126:    * Agrega un mensaje al historial y lo recorta si excede el máximo.
127:    * @param {string} phoneNumber Número del cliente.
128:    * @param {string} role 'user' o 'model'.
129:    * @param {string} text Contenido del mensaje.
130:    */
131:   addToHistory(phoneNumber, role, text) {
132:     const history = this.getHistory(phoneNumber);
133:     history.push({
134:       role,
135:       parts: [{ text }],
136:     });
137: 
138:     // Recortar historial si excede el máximo
139:     if (history.length > this.MAX_HISTORY) {
140:       history.splice(0, history.length - this.MAX_HISTORY);
141:     }
142:   }
143: 
144:   /**
145:    * Genera una respuesta de IA para el mensaje del cliente.
146:    * @param {string} phoneNumber Número del cliente.
147:    * @param {string} profileName Nombre del perfil del cliente.
148:    * @param {string} userMessage Mensaje recibido del cliente.
149:    * @returns {string} Respuesta generada por la IA.
150:    */
151:   async generateResponse(phoneNumber, profileName, userMessage) {
152:     // 1. Verificar si la conversación está pausada (traspaso a humano)
153:     if (this.isConversationPaused(phoneNumber)) {
154:       logger.debug(`⏭️ Omitiendo respuesta de IA para ${phoneNumber} porque la conversación está pausada.`);
155:       return null;
156:     }
157: 
158:     if (!this.model) {
159:       return `¡Hola, ${profileName}! Gracias por escribirnos. En este momento estoy en mantenimiento, pero un agente te atenderá pronto. 🙏`;
160:     }
161: 
162:     try {
163:       // Si el usuario escribe palabras de parada explícitas, pausar antes de llamar a la IA
164:       const cleanInput = userMessage.toLowerCase().trim();
165:       const explicitTransferKeywords = ['agente', 'asesor', 'humano', 'persona', 'vendedor', 'atencion al cliente', 'atención al cliente'];
166:       const matchesKeyword = explicitTransferKeywords.some(kw => cleanInput.includes(kw));
167: 
168:       if (matchesKeyword) {
169:         this.pauseConversation(phoneNumber);
170:         return `Entendido, ${profileName}. Te estoy comunicando con un asesor en este momento. Por favor espera unos minutos. 🙏`;
171:       }
172: 
173:       // Agregar contexto del usuario al mensaje
174:       const contextualMessage = `[Cliente: ${profileName}, Teléfono: ${phoneNumber}]\n${userMessage}`;
175: 
176:       // Obtener historial previo
177:       const history = this.getHistory(phoneNumber);
178: 
179:       // Crear chat con historial
180:       const chat = this.model.startChat({
181:         history: history.length > 0 ? history : undefined,
182:       });
183: 
184:       // Enviar mensaje y obtener respuesta
185:       let result = await chat.sendMessage(contextualMessage);
186:       
187:       // Manejar llamadas a funciones de catálogo si el modelo lo solicita
188:       let functionCalls = result.response.functionCalls();
189:       while (functionCalls && functionCalls.length > 0) {
190:         const functionResponses = [];
191: 
192:         for (const call of functionCalls) {
193:           if (call.name === 'searchCatalog') {
194:             const query = call.args.query;
195:             const searchResults = catalogService.searchCatalog(query);
196:             
197:             functionResponses.push({
198:               functionResponse: {
199:                 name: 'searchCatalog',
200:                 response: { results: searchResults }
201:               }
202:             });
203:           }
204:         }
205: 
206:         logger.debug({ msg: 'Enviando respuestas de función al modelo', count: functionResponses.length });
207:         result = await chat.sendMessage(functionResponses);
208:         functionCalls = result.response.functionCalls();
209:       }
210: 
211: 
212:       const response = result.response.text();
213: 
214: 
215:       // Guardar en historial
216:       this.addToHistory(phoneNumber, 'user', contextualMessage);
217:       this.addToHistory(phoneNumber, 'model', response);
218: 
219:       logger.info({
220:         msg: '🧠 Respuesta de Gemini AI generada',
221:         phoneNumber,
222:         profileName,
223:         inputLength: userMessage.length,
224:         outputLength: response.length,
225:       });
226: 
227:       // Si la IA respondió diciendo que lo comunicará con un asesor, pausar la conversación
228:       const lowerResponse = response.toLowerCase();
229:       if (lowerResponse.includes('comunico con un asesor') || lowerResponse.includes('asesor se pondrá en contacto') || lowerResponse.includes('espera unos minutos')) {
230:         this.pauseConversation(phoneNumber);
231:       }
232: 
233:       return response;
234:     } catch (error) {
235:       logger.error({
236:         msg: 'Error al generar respuesta con Gemini AI',
237:         phoneNumber,
238:         error: error.message,
239:       });
240: 
241:       // Respuesta de fallback en caso de error
242:       return `¡Hola, ${profileName}! Disculpa, estoy teniendo dificultades técnicas en este momento. Por favor, intenta de nuevo en unos minutos o escribe "agente" para hablar con una persona real. 🙏`;
243:     }
244:   }
245: 
246:   /**
247:    * Limpia el historial de una conversación específica.
248:    * @param {string} phoneNumber Número del cliente.
249:    */
250:   clearHistory(phoneNumber) {
251:     this.conversationHistory.delete(phoneNumber);
252:     logger.debug({ msg: 'Historial de conversación limpiado', phoneNumber });
253:   }
254: }
255: 
256: module.exports = new GeminiService();
```

## File: src/services/message.service.js
```javascript
  1: const fs = require('fs');
  2: const path = require('path');
  3: const axios = require('axios');
  4: const config = require('../config/environment');
  5: const logger = require('../utils/logger');
  6: const geminiService = require('./gemini.service');
  7: 
  8: 
  9: // Inicializar Gemini al cargar el módulo
 10: geminiService.initialize();
 11: 
 12: /**
 13:  * Servicio encargado de procesar la lógica de negocio para los eventos de WhatsApp.
 14:  */
 15: class MessageService {
 16:   constructor() {
 17:     // Almacena los IDs de los mensajes enviados por el bot para distinguirlos de los manuales
 18:     this.botSentMessageIds = new Set();
 19:   }
 20: 
 21:   /**
 22:    * Procesa la carga útil recibida de WhatsApp.
 23:    * @param {Object} payload Carga útil del webhook en bruto de Meta.
 24:    */
 25:   async processPayload(payload) {
 26:     try {
 27:       if (!payload.entry || !Array.isArray(payload.entry)) {
 28:         logger.warn('Carga útil recibida no tiene el formato entry esperado.');
 29:         return;
 30:       }
 31: 
 32:       for (const entry of payload.entry) {
 33:         if (!entry.changes || !Array.isArray(entry.changes)) continue;
 34: 
 35:         for (const change of entry.changes) {
 36:           const value = change.value;
 37:           if (!value) continue;
 38: 
 39:           // Caso 1: Es un mensaje entrante
 40:           if (value.messages && Array.isArray(value.messages)) {
 41:             for (const message of value.messages) {
 42:               await this.handleIncomingMessage(message, value);
 43:             }
 44:           }
 45: 
 46:           // Caso 2: Es una actualización de estado de un mensaje enviado por nosotros
 47:           if (value.statuses && Array.isArray(value.statuses)) {
 48:             for (const status of value.statuses) {
 49:               await this.handleStatusUpdate(status);
 50:             }
 51:           }
 52:         }
 53:       }
 54:     } catch (error) {
 55:       logger.error({ msg: 'Error procesando la carga útil de WhatsApp', error: error.message });
 56:       throw error;
 57:     }
 58:   }
 59: 
 60:   /**
 61:    * Maneja un mensaje entrante.
 62:    * @param {Object} message Objeto del mensaje individual.
 63:    * @param {Object} value Cambios del webhook.
 64:    */
 65:   async handleIncomingMessage(message, value) {
 66:     const from = message.from;
 67:     const messageId = message.id;
 68:     const messageType = message.type;
 69:     const contact = value.contacts && value.contacts[0];
 70:     const profileName = contact ? contact.profile.name : 'Desconocido';
 71: 
 72:     logger.info({
 73:       msg: 'Nuevo mensaje recibido',
 74:       from,
 75:       profileName,
 76:       messageId,
 77:       messageType,
 78:     });
 79: 
 80:     if (messageType === 'text') {
 81:       const body = message.text.body;
 82:       logger.info(`💬 Mensaje de texto de [${profileName}] (${from}): "${body}"`);
 83:       
 84:       // Generar respuesta con Gemini AI
 85:       const aiResponse = await geminiService.generateResponse(from, profileName, body);
 86:       if (aiResponse) {
 87:         await this.sendTextMessage(from, aiResponse);
 88:       }
 89:     } else if (messageType === 'image' || messageType === 'audio' || messageType === 'video' || messageType === 'document') {
 90:       logger.info(`📎 Mensaje de tipo "${messageType}" recibido de [${profileName}].`);
 91:       if (!geminiService.isConversationPaused(from)) {
 92:         await this.sendTextMessage(from, `¡Hola, ${profileName}! He recibido tu archivo. Por el momento solo puedo procesar mensajes de texto. Si necesitas ayuda, escríbeme tu consulta y con gusto te asisto. 😊`);
 93:       }
 94:     } else if (messageType === 'sticker') {
 95:       logger.info(`🎉 Sticker recibido de [${profileName}].`);
 96:       if (!geminiService.isConversationPaused(from)) {
 97:         await this.sendTextMessage(from, `😄 ¡Bonito sticker, ${profileName}! ¿En qué puedo ayudarte hoy?`);
 98:       }
 99:     } else {
100:       logger.info(`📎 Mensaje de tipo "${messageType}" recibido (no procesado).`);
101:     }
102:   }
103: 
104:   /**
105:    * Envía un mensaje de texto de respuesta llamando a la API Graph de Meta.
106:    * @param {string} to Número de teléfono del destinatario.
107:    * @param {string} text Texto del mensaje a enviar.
108:    */
109:   async sendTextMessage(to, text) {
110:     if (!config.ACCESS_TOKEN || !config.PHONE_NUMBER_ID) {
111:       logger.warn('No se puede enviar respuesta automática: ACCESS_TOKEN o PHONE_NUMBER_ID no configurados.');
112:       return;
113:     }
114: 
115:     try {
116:       logger.debug({ msg: 'Enviando mensaje de WhatsApp a Meta', to, text });
117:       
118:       const response = await axios({
119:         method: 'POST',
120:         url: `https://graph.facebook.com/v25.0/${config.PHONE_NUMBER_ID}/messages`,
121:         headers: {
122:           'Authorization': `Bearer ${config.ACCESS_TOKEN}`,
123:           'Content-Type': 'application/json'
124:         },
125:         data: {
126:           messaging_product: 'whatsapp',
127:           recipient_type: 'individual',
128:           to: to,
129:           type: 'text',
130:           text: {
131:             preview_url: false,
132:             body: text
133:           }
134:         }
135:       });
136: 
137:       const sentMessageId = response.data.messages[0].id;
138:       // Guardar el ID para saber que este mensaje fue enviado por el bot
139:       this.botSentMessageIds.add(sentMessageId);
140: 
141:       logger.info({
142:         msg: 'Mensaje de respuesta automática enviado correctamente a Meta',
143:         recipient: to,
144:         messageId: sentMessageId
145:       });
146:     } catch (error) {
147:       const errorResponse = error.response ? error.response.data : error.message;
148:       logger.error({
149:         msg: 'Fallo al enviar el mensaje de respuesta automática a través de Meta',
150:         to,
151:         error: errorResponse
152:       });
153:     }
154:   }
155: 
156:   /**
157:    * Envía un mensaje a una conversación de Chatwoot, con soporte opcional para imagen adjunta.
158:    * @param {string|number} conversationId ID de la conversación en Chatwoot.
159:    * @param {string} text Texto del mensaje.
160:    * @param {string} [imageFileName] Nombre del archivo de imagen adjunto.
161:    */
162:   async sendChatwootMessage(conversationId, text, imageFileName) {
163:     if (!config.CHATWOOT_ACCESS_TOKEN || !config.CHATWOOT_ACCOUNT_ID) {
164:       logger.warn('No se puede enviar respuesta a Chatwoot: CHATWOOT_ACCESS_TOKEN o CHATWOOT_ACCOUNT_ID no configurados.');
165:       return;
166:     }
167: 
168:     try {
169:       const url = `${config.CHATWOOT_API_URL}/api/v1/accounts/${config.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`;
170:       let response;
171: 
172:       if (imageFileName) {
173:         const imagePath = path.join(__dirname, '..', 'public', 'images', imageFileName);
174:         if (fs.existsSync(imagePath)) {
175:           logger.debug({ msg: 'Enviando mensaje con imagen adjunta a Chatwoot', conversationId, imageFileName });
176:           const formData = new FormData();
177:           formData.append('content', text);
178:           formData.append('message_type', 'outgoing');
179:           formData.append('private', 'false');
180: 
181:           const fileBuffer = fs.readFileSync(imagePath);
182:           const ext = path.extname(imageFileName).toLowerCase();
183:           const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
184:           
185:           const blob = new Blob([fileBuffer], { type: mimeType });
186:           formData.append('attachments[]', blob, imageFileName);
187: 
188:           response = await axios.post(url, formData, {
189:             headers: {
190:               'api_access_token': config.CHATWOOT_ACCESS_TOKEN
191:             }
192:           });
193:         } else {
194:           logger.warn({ msg: 'El archivo de imagen no existe localmente', imagePath });
195:         }
196:       }
197: 
198:       if (!response) {
199:         logger.debug({ msg: 'Enviando mensaje de texto simple a Chatwoot', conversationId, text });
200:         response = await axios({
201:           method: 'POST',
202:           url,
203:           headers: {
204:             'api_access_token': config.CHATWOOT_ACCESS_TOKEN,
205:             'Content-Type': 'application/json'
206:           },
207:           data: {
208:             content: text,
209:             message_type: 'outgoing',
210:             private: false
211:           }
212:         });
213:       }
214: 
215:       const sentMessageId = response.data.id;
216:       // Guardar el ID para saber que este mensaje fue enviado por el bot
217:       this.botSentMessageIds.add(sentMessageId);
218: 
219:       logger.info({
220:         msg: 'Mensaje de respuesta del bot enviado a Chatwoot correctamente',
221:         conversationId,
222:         messageId: sentMessageId,
223:         hasImage: !!imageFileName
224:       });
225:     } catch (error) {
226:       const errorResponse = error.response ? error.response.data : error.message;
227:       logger.error({
228:         msg: 'Fallo al enviar mensaje a Chatwoot',
229:         conversationId,
230:         error: errorResponse
231:       });
232:     }
233:   }
234: 
235: 
236: 
237:   /**
238:    * Maneja actualizaciones de estado de mensajes.
239:    * @param {Object} status Objeto del estado individual.
240:    */
241:   async handleStatusUpdate(status) {
242:     const messageId = status.id;
243:     const state = status.status; // sent, delivered, read, failed
244:     const recipient = status.recipient_id;
245: 
246:     logger.debug({
247:       msg: 'Actualización de estado de mensaje',
248:       messageId,
249:       state,
250:       recipient,
251:     });
252: 
253:     logger.info(`📈 Estado del mensaje [${messageId}] para [${recipient}]: ${state.toUpperCase()}`);
254:     
255:     // Si detectamos un estado 'sent' de un mensaje que NO fue enviado por el bot,
256:     // significa que un agente humano respondió desde el Meta Business Suite.
257:     if (state === 'sent') {
258:       if (this.botSentMessageIds.has(messageId)) {
259:         // Fue el bot, removemos el ID y no pausamos
260:         this.botSentMessageIds.delete(messageId);
261:       } else {
262:         // Fue un humano desde la bandeja de entrada, pausamos el bot por 2 horas
263:         logger.info(`👤 Mensaje manual de agente detectado hacia ${recipient}. Pausando bot.`);
264:         geminiService.pauseConversation(recipient);
265:       }
266:     }
267: 
268:     if (state === 'failed' && status.errors) {
269:       logger.error({
270:         msg: 'Error en envío de mensaje de WhatsApp',
271:         messageId,
272:         recipient,
273:         errors: status.errors,
274:       });
275:     }
276:   }
277: }
278: 
279: module.exports = new MessageService();
```

## File: src/services/queue.service.js
```javascript
 1: const messageService = require('./message.service');
 2: const logger = require('../utils/logger');
 3: 
 4: class QueueService {
 5:   /**
 6:    * Agrega un trabajo a la cola de procesamiento.
 7:    * En esta implementación inicial, procesa el trabajo de forma asíncrona usando setImmediate.
 8:    * Esto libera instantáneamente el flujo HTTP para poder responder con 200 OK de inmediato a Meta.
 9:    * 
10:    * NOTA PARA PRODUCCIÓN: Puedes reemplazar este método para agregar los trabajos a BullMQ con Redis
11:    * para tener persistencia y reintentos ante fallas del servidor.
12:    * 
13:    * @param {string} jobName Nombre del tipo de trabajo.
14:    * @param {Object} data Payload de WhatsApp a procesar.
15:    * @returns {Promise<{id: string}>} Retorna una promesa con un ID de trabajo simulado.
16:    */
17:   async addJob(jobName, data) {
18:     logger.debug({ msg: 'Encolando tarea asíncrona local', jobName });
19: 
20:     // setImmediate saca la ejecución de la pila actual de llamadas de Express
21:     setImmediate(async () => {
22:       try {
23:         logger.debug({ msg: 'Iniciando procesamiento de tarea en segundo plano', jobName });
24:         
25:         if (jobName === 'process-whatsapp-payload') {
26:           await messageService.processPayload(data);
27:         } else {
28:           logger.warn({ msg: 'Trabajo no reconocido por la cola', jobName });
29:         }
30:         
31:         logger.debug({ msg: 'Tarea en segundo plano completada', jobName });
32:       } catch (error) {
33:         logger.error({
34:           msg: `Error ejecutando tarea en segundo plano: ${jobName}`,
35:           error: error.message,
36:           stack: error.stack,
37:         });
38:       }
39:     });
40: 
41:     return { id: `job_mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
42:   }
43: }
44: 
45: module.exports = new QueueService();
```

## File: src/utils/logger.js
```javascript
 1: const pino = require('pino');
 2: 
 3: const transport = process.env.NODE_ENV !== 'production'
 4:   ? {
 5:       target: 'pino-pretty',
 6:       options: {
 7:         colorize: true,
 8:         translateTime: 'SYS:standard',
 9:         ignore: 'pid,hostname',
10:       },
11:     }
12:   : undefined;
13: 
14: const logger = pino({
15:   level: process.env.LOG_LEVEL || 'debug',
16:   transport,
17: });
18: 
19: module.exports = logger;
```

## File: src/app.js
```javascript
 1: const express = require('express');
 2: const path = require('path');
 3: const webhookRoutes = require('./routes/webhook.routes');
 4: const errorHandler = require('./middleware/errorHandler');
 5: 
 6: const app = express();
 7: 
 8: // Servir imágenes estáticas de los productos del catálogo
 9: app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
10: 
11: 
12: // Capturamos el body original en bytes (rawBody) antes de parsearlo como JSON.
13: // Esto es requerido para la verificación HMAC SHA256 de las firmas de Meta.
14: app.use(express.json({
15:   limit: '5mb', // Meta especifica que las cargas útiles de los webhooks pueden pesar hasta 3MB
16:   verify: (req, res, buf, encoding) => {
17:     if (buf && buf.length) {
18:       req.rawBody = buf.toString(encoding || 'utf8');
19:     }
20:   }
21: }));
22: 
23: // Servir un endpoint raíz básico por comodidad
24: app.get('/', (req, res) => {
25:   res.json({
26:     status: 'online',
27:     message: 'Servidor Webhook para WhatsApp Cloud API listo.',
28:     endpoints: {
29:       webhook_verification: 'GET /webhook',
30:       webhook_events: 'POST /webhook',
31:       chatwoot_webhook: 'POST /webhook/chatwoot-webhook'
32:     }
33: 
34:   });
35: });
36: 
37: // Rutas del Webhook
38: app.use('/webhook', webhookRoutes);
39: 
40: // Manejador global de excepciones
41: app.use(errorHandler);
42: 
43: module.exports = app;
```

## File: src/server.js
```javascript
 1: const app = require('./app');
 2: const config = require('./config/environment');
 3: const logger = require('./utils/logger');
 4: 
 5: const server = app.listen(config.PORT, () => {
 6:   logger.info(`🚀 Servidor Webhook de WhatsApp corriendo en el puerto ${config.PORT}`);
 7:   logger.info(`Entorno de ejecución: ${config.NODE_ENV}`);
 8:   logger.info(`Token de verificación configurado: "${config.VERIFY_TOKEN}"`);
 9: });
10: 
11: // Apagado controlado (Graceful Shutdown)
12: const gracefulShutdown = () => {
13:   logger.info('Apagando servidor Webhook...');
14:   server.close(() => {
15:     logger.info('Servidor HTTP cerrado.');
16:     process.exit(0);
17:   });
18: };
19: 
20: process.on('SIGTERM', gracefulShutdown);
21: process.on('SIGINT', gracefulShutdown);
```

## File: .env.example
```
1: PORT=3000
2: NODE_ENV=development
3: VERIFY_TOKEN=your_verify_token_here
4: APP_SECRET=your_app_secret_here
5: ACCESS_TOKEN=your_access_token_here
6: PHONE_NUMBER_ID=your_phone_number_id_here
```

## File: .gitignore
```
1: node_modules/
2: .env
3: tunnel.txt
4: tunnel.log
5: .system_generated/
6: *.log
```

## File: package.json
```json
 1: {
 2:   "name": "whatsapp-webhook",
 3:   "version": "1.0.0",
 4:   "description": "WhatsApp Cloud API Webhook using Express, pino, and clean architecture",
 5:   "main": "src/server.js",
 6:   "scripts": {
 7:     "start": "node src/server.js",
 8:     "dev": "node src/server.js"
 9:   },
10:   "keywords": [
11:     "whatsapp",
12:     "webhook",
13:     "express",
14:     "node"
15:   ],
16:   "author": "",
17:   "license": "ISC",
18:   "dependencies": {
19:     "@google/generative-ai": "^0.24.1",
20:     "axios": "^1.7.2",
21:     "dotenv": "^16.4.5",
22:     "exceljs": "^4.4.0",
23:     "express": "^4.19.2",
24:     "pino": "^9.2.0",
25:     "xlsx": "^0.18.5"
26:   },
27:   "devDependencies": {
28:     "cloudflared": "^0.7.1",
29:     "ngrok": "^5.0.0-beta.2",
30:     "pino-pretty": "^11.2.1"
31:   },
32:   "allowScripts": {
33:     "ngrok@5.0.0-beta.2": true,
34:     "cloudflared@0.7.1": true
35:   }
36: }
```

## File: repomix.config.json
```json
 1: {
 2:   "output": {
 3:     "filePath": "project-context.md",
 4:     "style": "markdown",
 5:     "removeComments": false,
 6:     "removeEmptyLines": false,
 7:     "showLineNumbers": true
 8:   },
 9:   "ignore": {
10:     "customPatterns": [
11:       "node_modules/**",
12:       ".git/**",
13:       "src/public/images/**",
14:       "scratch/**",
15:       ".agents/**",
16:       "src/config/catalog.json",
17:       "package-lock.json",
18:       "repomix-output.xml",
19:       "project-context.md"
20:     ]
21:   }
22: }
```

## File: tunnel.js
```javascript
 1: const ngrok = require('ngrok');
 2: 
 3: (async function() {
 4:   try {
 5:     const url = await ngrok.connect({
 6:       proto: 'http',
 7:       addr: 3000
 8:     });
 9:     console.log('NGROK_URL:', url);
10:   } catch (err) {
11:     console.error('NGROK_ERROR:', err);
12:   }
13: })();
```
