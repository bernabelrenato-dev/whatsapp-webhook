const axios = require('axios');
const pool = require('../src/utils/db');

const typebotId = 'jgis-publicidad-bot-f33vo50';
const typebotUrl = 'http://typebot-viewer:3000';

async function testStartParams(name, payload) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`🧪 PROBANDO START CHAT PAYLOAD: ${name}`);
  console.log(`---------------------------------------------------------`);

  try {
    const res = await axios.post(`${typebotUrl}/api/v1/typebots/${typebotId}/startChat`, payload);
    console.log('STATUS:', res.status);
    console.log('MESSAGES COUNT:', res.data.messages ? res.data.messages.length : 0);
    console.log('RESPONSE DATA:', JSON.stringify(res.data, null, 2));
    if (res.data.messages && res.data.messages.length > 0) {
      console.log('🎉 ¡¡¡ÉXITO DEFINITIVO FUERA DE DUDA!!!');
      return true;
    }
  } catch (e) {
    console.log('ERROR:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
  return false;
}

async function runAllParamTests() {
  await testStartParams('1. startGroupId: group_apertura', {
    isSimulated: false,
    startGroupId: 'group_apertura'
  });

  await testStartParams('2. startEventId: event_start', {
    isSimulated: false,
    startEventId: 'event_start'
  });

  await testStartParams('3. isTest: true + startGroupId', {
    isTest: true,
    startGroupId: 'group_apertura'
  });
}

runAllParamTests();
