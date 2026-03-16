/**
 * Middleware global de manejo de errores
 * Centraliza el manejo de errores y respuestas consistentes
 */

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[${statusCode}] ${req.method} ${req.originalUrl}`, message);
  if (statusCode === 500 && err?.stack) console.error(err.stack);

  // Error de validación (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Prisma / DB errors (no exponer detalles internos al cliente)
  if (err.code === 'P2025' || err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: 'Recurso no encontrado',
    });
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Error interno del servidor' : message,
  });
};
