const http = require('http');

const payload = JSON.stringify({
  inputs: {},
  query: 'Hola',
  response_mode: 'streaming',
  user: 'test-user'
});

const req = http.request('http://api:5001/v1/chat-messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer app-djKLJf4B1hNovBfEfe19Q0rX'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('CHUNK:', chunk.toString());
  });
  res.on('end', () => {
    console.log('END');
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(payload);
req.end();
