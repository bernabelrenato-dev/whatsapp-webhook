const fs = require('fs');
const path = require('path');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/config/typebot_master_schema.json'), 'utf8'));

console.log('🔍 Auditando bloques de Typebot en busca de propiedades faltantes para Typebot v6 Zod Schema...\n');

let issues = 0;

schema.groups.forEach((g, gIdx) => {
  g.blocks.forEach((b, bIdx) => {
    // Check choice input items
    if (b.type === 'choice input') {
      if (!b.items || !Array.isArray(b.items)) {
        console.error(`❌ [Grupo ${gIdx} "${g.title}" - Bloque ${bIdx} "${b.id}"] Choice input no tiene "items" array.`);
        issues++;
      } else {
        b.items.forEach((item, iIdx) => {
          if (!item.outgoingEdgeId) {
            console.error(`❌ [Grupo ${gIdx} "${g.title}" - Bloque ${bIdx} "${b.id}"] Item ${iIdx} ("${item.content}") falta "outgoingEdgeId".`);
            issues++;
          }
        });
      }
    }

    // Check picture input / file input
    if (b.type === 'picture input' || b.type === 'file input') {
      if (!b.options || !b.options.labels || typeof b.options.labels.label !== 'string') {
        console.error(`❌ [Grupo ${gIdx} "${g.title}" - Bloque ${bIdx} "${b.id}"] "${b.type}" le falta "options.labels.label" o "options.labels.button".`);
        issues++;
      }
    }

    // Check text input
    if (b.type === 'text input') {
      if (!b.options || !b.options.labels || typeof b.options.labels.placeholder !== 'string') {
        console.error(`⚠️ [Grupo ${gIdx} "${g.title}" - Bloque ${bIdx} "${b.id}"] "text input" le falta "options.labels.placeholder".`);
      }
    }
  });
});

if (issues === 0) {
  console.log('✅ ¡Todos los bloques pasaron la auditoría Zod Schema!');
} else {
  console.log(`\n🚨 Se encontraron ${issues} problemas en el esquema.`);
}
