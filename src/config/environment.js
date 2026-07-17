require('dotenv').config();
const logger = require('../utils/logger');

const environment = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
  APP_SECRET: process.env.APP_SECRET,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  CHATWOOT_API_URL: process.env.CHATWOOT_API_URL || 'https://app.chatwoot.com',
  CHATWOOT_ACCESS_TOKEN: process.env.CHATWOOT_ACCESS_TOKEN,
  CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID,
};

// Validaciones al arrancar
if (!environment.VERIFY_TOKEN) {
  logger.warn('La variable VERIFY_TOKEN no está configurada en .env. La verificación de Meta fallará.');
}

if (!environment.APP_SECRET && environment.NODE_ENV === 'production') {
  logger.error('CRÍTICO: APP_SECRET no está configurada en producción. Las firmas no podrán ser verificadas. Saliendo...');
  process.exit(1);
}

module.exports = environment;
