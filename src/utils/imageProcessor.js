const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('./logger');
const config = require('../config/environment');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  logger.info('Librería sharp no cargada, usando procesamiento directo de buffers');
  sharp = null;
}

/**
 * Optimiza y almacena una imagen (incluyendo 4K) en la carpeta estática pública para servirla públicamente a Meta/WhatsApp.
 * @param {string|Buffer} source URL de origen o Buffer de la imagen.
 * @param {string} [customFileName] Nombre opcional para el archivo resultante.
 * @returns {Promise<string>} URL pública limpia e inmune a problemas de autenticación/302/4K.
 */
async function processAndStoreImage(source, customFileName) {
  try {
    let inputBuffer;
    let mimeType = 'image/jpeg';

    if (Buffer.isBuffer(source)) {
      inputBuffer = source;
    } else if (typeof source === 'string') {
      let downloadUrl = source;

      // Si la URL apunta a localhost o chatwoot interno, ajustar para resolución interna de docker si aplica
      if (downloadUrl.includes('localhost:3010') || downloadUrl.includes('127.0.0.1:3010')) {
        const chatwootHost = process.env.CHATWOOT_INTERNAL_URL || 'http://chatwoot:3000';
        downloadUrl = downloadUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):3010/, chatwootHost);
      }

      const headers = {};
      if (config.CHATWOOT_ACCESS_TOKEN && downloadUrl.includes('chatwoot')) {
        headers['api_access_token'] = config.CHATWOOT_ACCESS_TOKEN;
      }

      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers,
        timeout: 15000,
      });

      inputBuffer = Buffer.from(response.data);
      if (response.headers['content-type']) {
        mimeType = response.headers['content-type'];
      }
    } else {
      throw new Error('Fuente de imagen no válida');
    }

    let processedBuffer = inputBuffer;

    // Si la imagen supera 4 MB o si sharp está disponible, comprimir y optimizar
    if (sharp) {
      try {
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();

        // Redimensionar si supera 1920px de ancho/alto o si el buffer es mayor a 4MB
        if (metadata.width > 1920 || metadata.height > 1920 || inputBuffer.length > 4 * 1024 * 1024) {
          processedBuffer = await image
            .resize({
              width: 1920,
              height: 1920,
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer();
          logger.info(`📸 Imagen optimizada exitosamente (${Math.round(inputBuffer.length / 1024)}KB -> ${Math.round(processedBuffer.length / 1024)}KB)`);
        }
      } catch (sharpErr) {
        logger.warn({ msg: 'Error al optimizar imagen con sharp, usando buffer original', error: sharpErr.message });
      }
    }

    const ext = '.jpg';
    const fileName = customFileName || `outbound_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    const publicDir = path.join(__dirname, '..', 'public', 'images');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, fileName);
    fs.writeFileSync(filePath, processedBuffer);

    const baseUrl = process.env.PUBLIC_URL || 'https://bot.jgispublicidad.pe';
    const publicUrl = `${baseUrl}/images/${fileName}`;

    logger.info({ msg: 'Imagen alojada públicamente para Meta Cloud API', publicUrl, sizeBytes: processedBuffer.length });
    return publicUrl;
  } catch (error) {
    logger.error({ msg: 'Error procesando y almacenando imagen', error: error.message });
    throw error;
  }
}

module.exports = {
  processAndStoreImage
};
