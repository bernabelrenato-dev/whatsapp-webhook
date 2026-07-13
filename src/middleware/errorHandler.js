const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error({
    msg: 'Error no controlado capturado por el middleware',
    err: {
      message: err.message,
      stack: err.stack,
    },
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || err.status || 500;
  
  res.status(statusCode).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message,
      status: statusCode,
    }
  });
};
