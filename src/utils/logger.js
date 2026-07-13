const pino = require('pino');

const transport = process.env.NODE_ENV !== 'production'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  transport,
});

module.exports = logger;
