const axios = require('axios');

async function testWorkingStartChat() {
  const typebotUrl = 'http://typebot-viewer:3000';
  const pubId = 'pub_ecd56eb52ac6744d';
  const tbId = 'tb_e94d31cb62545d1b';

  console.log(`1️⃣ Probando startChat con Public ID ${pubId}...`);
  try {
    const res1 = await axios.post(`${typebotUrl}/api/v1/typebots/${pubId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res1.status);
    console.log('MESSAGES COUNT:', res1.data.messages ? res1.data.messages.length : 0);
    console.log('DATA:', JSON.stringify(res1.data, null, 2));
  } catch (e) {
    console.log('ERROR:', e.response ? e.response.data : e.message);
  }

  console.log(`\n2️⃣ Probando startChat con Typebot ID ${tbId}...`);
  try {
    const res2 = await axios.post(`${typebotUrl}/api/v1/typebots/${tbId}/startChat`, { isSimulated: false });
    console.log('STATUS:', res2.status);
    console.log('MESSAGES COUNT:', res2.data.messages ? res2.data.messages.length : 0);
    console.log('DATA:', JSON.stringify(res2.data, null, 2));
  } catch (e) {
    console.log('ERROR:', e.response ? e.response.data : e.message);
  }
}

testWorkingStartChat();
