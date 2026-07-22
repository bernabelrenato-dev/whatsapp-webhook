require('dotenv').config();
const typebotGeneratorService = require('../src/services/typebotGenerator.service');

async function runTypebotFlowGenerator() {
  const promptInput = process.argv[2] || 'Crea un flujo comercial para cotización de Polos Publicitarios de Algodón pidiendo cantidad, estampado y teléfono';

  console.log('🤖 =========================================================================');
  console.log('⚡ GENERADOR AUTOMÁTICO DE FLUJOS TYPEBOT POR IA (JGIS PUBLICIDAD)');
  console.log('🤖 =========================================================================\n');

  console.log(`📝 Prompt Recibido:\n   "${promptInput}"\n`);

  try {
    const result = await typebotGeneratorService.generateAndPublishFlow(promptInput);

    console.log('🎉 =========================================================================');
    console.log('✅ ¡FLUJO DE TYPEBOT GENERADO Y PUBLICADO EN TIEMPO REAL!');
    console.log('🎉 =========================================================================');
    console.log(`📌 Nombre del Flujo : ${result.name}`);
    console.log(`🔑 Typebot ID       : ${result.typebotId}`);
    console.log(`🌐 Public ID        : ${result.publicId}`);
    console.log(`🔗 Enlace Editor UI  : ${result.editUrl}`);
    console.log('=========================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error generando el flujo de Typebot:', err.message);
    process.exit(1);
  }
}

runTypebotFlowGenerator();
