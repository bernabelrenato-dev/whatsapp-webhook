const pino = require('pino');

let transport;
if (process.env.NODE_ENV !== 'production') {
  try {
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  } catch (e) {
    transport = undefined;
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  transport,
});

module.exports = logger;
