const messageService = require('./message.service');
const logger = require('../utils/logger');

class QueueService {
  /**
   * Agrega un trabajo a la cola de procesamiento.
   * En esta implementación inicial, procesa el trabajo de forma asíncrona usando setImmediate.
   * Esto libera instantáneamente el flujo HTTP para poder responder con 200 OK de inmediato a Meta.
   * 
   * NOTA PARA PRODUCCIÓN: Puedes reemplazar este método para agregar los trabajos a BullMQ con Redis
   * para tener persistencia y reintentos ante fallas del servidor.
   * 
   * @param {string} jobName Nombre del tipo de trabajo.
   * @param {Object} data Payload de WhatsApp a procesar.
   * @returns {Promise<{id: string}>} Retorna una promesa con un ID de trabajo simulado.
   */
  async addJob(jobName, data) {
    logger.debug({ msg: 'Encolando tarea asíncrona local', jobName });

    // setImmediate saca la ejecución de la pila actual de llamadas de Express
    setImmediate(async () => {
      try {
        logger.debug({ msg: 'Iniciando procesamiento de tarea en segundo plano', jobName });
        
        if (jobName === 'process-whatsapp-payload') {
          await messageService.processPayload(data);
        } else {
          logger.warn({ msg: 'Trabajo no reconocido por la cola', jobName });
        }
        
        logger.debug({ msg: 'Tarea en segundo plano completada', jobName });
      } catch (error) {
        logger.error({
          msg: `Error ejecutando tarea en segundo plano: ${jobName}`,
          error: error.message,
          stack: error.stack,
        });
      }
    });

    return { id: `job_mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
  }
}

module.exports = new QueueService();
