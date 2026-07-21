const fs = require('fs');
const path = require('path');
const { processAndStoreImage } = require('../src/utils/imageProcessor');

async function runTests() {
  console.log('🧪 Iniciando Pruebas Locales E2E (Optimización de Imágenes 4K y Meta Ads Referral)...');

  try {
    // 1. Probar procesamiento de buffer de imagen
    const dummyBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
    const publicUrl = await processAndStoreImage(dummyBuffer, 'test_image.jpg');

    console.log('✅ Prueba 1 - Alojamiento público de imagen exitoso:', publicUrl);
    if (!publicUrl.includes('/images/test_image.jpg')) {
      throw new Error('La URL generada no coincide con el formato esperado');
    }

    const localFilePath = path.join(__dirname, '..', 'src', 'public', 'images', 'test_image.jpg');
    if (!fs.existsSync(localFilePath)) {
      throw new Error('El archivo procesado no fue creado en el disco');
    }
    console.log('✅ Prueba 2 - Verificación de archivo en disco exitosa:', localFilePath);

    console.log('🎉 Todas las pruebas locales finalizaron con EXIT CODE 0.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fallo en las pruebas locales:', error.message);
    process.exit(1);
  }
}

runTests();
