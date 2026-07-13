const ngrok = require('ngrok');

(async function() {
  try {
    const url = await ngrok.connect({
      proto: 'http',
      addr: 3000
    });
    console.log('NGROK_URL:', url);
  } catch (err) {
    console.error('NGROK_ERROR:', err);
  }
})();
