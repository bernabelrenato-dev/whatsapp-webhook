const app = require('./app');
const config = require('./config/environment');
const logger = require('./utils/logger');

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 Servidor Webhook de WhatsApp corriendo en el puerto ${config.PORT}`);
  logger.info(`Entorno de ejecución: ${config.NODE_ENV}`);
  logger.info(`Token de verificación configurado: "${config.VERIFY_TOKEN}"`);

  // Auto-publicar flujo máster de Typebot v6 en la base de datos PostgreSQL de producción
  if (process.env.DATABASE_URL) {
    setTimeout(() => {
      try {
        const { publishMasterFlow } = require('../scripts/publish_jgis_master_flow');
        publishMasterFlow().then(() => {
          logger.info('✅ Flujo Maestro de Typebot v6 auto-publicado en PostgreSQL de producción.');
        }).catch(err => {
          logger.error({ msg: 'Aviso al auto-publicar flujo de Typebot al arrancar servidor', error: err.message });
        });
      } catch (e) {
        logger.error({ msg: 'Error al requerir publish_jgis_master_flow', error: e.message });
      }
    }, 2000);
  }
});

// Apagado controlado (Graceful Shutdown)
const gracefulShutdown = () => {
  logger.info('Apagando servidor Webhook...');
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ msg: '⚠️ Advertencia Senior: Promesa no capturada detectada (Unhandled Rejection)', reason: reason?.message || reason, stack: reason?.stack });
});

process.on('uncaughtException', (error) => {
  logger.error({ msg: '🚨 Excepción no capturada en tiempo de ejecución (Uncaught Exception)', error: error?.message, stack: error?.stack });
});

