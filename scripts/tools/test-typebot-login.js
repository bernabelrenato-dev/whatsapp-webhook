const axios = require('axios');
const https = require('https');

async function testLogin() {
  const email = 'ventas.centrolima@jgispublicidad.pe';
  const baseUrl = 'https://bot.jgispublicidad.pe';
  const mailhogUrl = 'http://mailhog:8025/api/v2/messages';

  console.log('=== Starting Typebot Signin E2E Test ===');
  
  // Create an axios instance that persists cookies
  const instance = axios.create({
    baseURL: baseUrl,
    validateStatus: () => true,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  });

  // Keep track of cookies
  let cookies = [];
  instance.interceptors.response.use((response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookieStr => {
        const parts = cookieStr.split(';');
        cookies.push(parts[0]);
      });
    }
    return response;
  });

  instance.interceptors.request.use((config) => {
    if (cookies.length > 0) {
      // De-duplicate cookies
      const uniqueCookies = [...new Set(cookies)];
      config.headers['Cookie'] = uniqueCookies.join('; ');
    }
    return config;
  });

  console.log('1. Fetching CSRF Token...');
  const csrfRes = await instance.get('/api/auth/csrf');
  console.log('CSRF Status:', csrfRes.status);
  console.log('CSRF Response:', csrfRes.data);
  const csrfToken = csrfRes.data.csrfToken;
  if (!csrfToken) {
    throw new Error('Could not find CSRF token');
  }

  console.log('\n2. Requesting Sign-In Link...');
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('csrfToken', csrfToken);
  params.append('json', 'true');

  const signinRes = await instance.post('/api/auth/signin/nodemailer', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  console.log('Signin Status:', signinRes.status);

  console.log('\n3. Waiting for MailHog email...');
  await new Promise(r => setTimeout(r, 3000));

  const mailhogRes = await axios.get(mailhogUrl);
  const messages = mailhogRes.data.items || [];
  console.log(`Found ${messages.length} messages in MailHog.`);

  // Find most recent email to our address containing signin/email-redirect
  const loginEmail = messages.find(msg => 
    msg.Raw.To && 
    msg.Raw.To.some(toAddr => toAddr.includes(email)) &&
    msg.Content.Body.includes('/signin/email-redirect')
  );

  if (!loginEmail) {
    throw new Error('Login email not found in MailHog!');
  }

  // Extract 6-digit token from email body
  const body = loginEmail.Content.Body.replace(/=\r?\n/g, '');
  const tokenMatch = body.match(/token=3D([0-9]+)/);
  if (!tokenMatch) {
    throw new Error('6-digit security token not found in email body!');
  }
  const token = tokenMatch[1];
  console.log('Extracted Security Token:', token);

  const magicLink = `https://bot.jgispublicidad.pe/api/auth/callback/nodemailer?token=${token}&email=${encodeURIComponent(email)}`;
  console.log('Constructed Server-side Magic Link:', magicLink);

  console.log('\n4. Clicking Magic Link (disabling auto-redirect)...');
  const callbackRes = await instance.get(magicLink, {
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  });
  console.log('Callback Status:', callbackRes.status);
  console.log('Callback Headers:', callbackRes.headers);
  console.log('Callback Cookies:', cookies);

  console.log('\n5. Fetching Active Session info...');
  const sessionRes = await instance.get('/api/auth/session');
  console.log('Session Status:', sessionRes.status);
  console.log('Session Headers:', sessionRes.headers);
  console.log('Session Data:', sessionRes.data);

  if (sessionRes.status === 200 && sessionRes.data && sessionRes.data.user) {
    console.log('\n=== SUCCESS: Active session verified! E2E login works 100%! ===');
  } else {
    throw new Error('Failed to verify active session!');
  }
}

testLogin().catch(err => {
  console.error('\n=== TEST FAILED ===');
  console.error('Error:', err.message);
  process.exit(1);
});
