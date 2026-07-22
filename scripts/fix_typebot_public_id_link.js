const pool = require('../src/utils/db');
const axios = require('axios');

async function fixLinkAndTest() {
  const typebotId = 'jgis-publicidad-bot-f33vo50';
  const typebotUrl = 'http://typebot-viewer:3000';

  console.log('🔧 Vinculando Typebot y PublicTypebot con publicId exacto...');

  // 1. Asegurar que publicId en Typebot es igual a typebotId
  await pool.query(`UPDATE "Typebot" SET "publicId" = $1 WHERE id = $1;`, [typebotId]);

  // 2. Copiar exactamente la estructura del Typebot nativo de Builder (pub_ecd56eb52ac6744d)
  const workingRes = await pool.query(`SELECT groups, variables, theme, settings FROM "PublicTypebot" WHERE id = 'pub_ecd56eb52ac6744d';`);
  if (workingRes.rows.length === 0) {
    console.log('❌ No working template found');
    return;
  }

  const template = workingRes.rows[0];

  // Reemplazar el texto del saludo con el Flujo de Gorras Trucker JGIS
  template.groups[0].blocks[0].content = {
    richText: [
      { children: [{ text: '👋 ¡Hola! Soy Renato, asesor de JGIS 🧢\nVi que te interesó nuestro producto 👀\n¿Es para uso personal 🙋‍♂️ o para tu empresa/evento? 🏢' }] }
    ]
  };

  await pool.query(
    `UPDATE "Typebot" SET groups = $1, events = NULL, edges = '[]'::jsonb, "updatedAt" = NOW() WHERE id = $2;`,
    [JSON.stringify(template.groups), typebotId]
  );
  await pool.query(
    `UPDATE "PublicTypebot" SET groups = $1, events = NULL, edges = '[]'::jsonb, "updatedAt" = NOW() WHERE id = $2;`,
    [JSON.stringify(template.groups), typebotId]
  );

  console.log('✅ DB sincronizada con el modelo nativo exacto.');

  // 3. Probar startChat
  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, { isSimulated: false });
    console.log('STATUS startChat:', res.status);
    console.log('DATA:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('ERROR startChat:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
}

fixLinkAndTest();
