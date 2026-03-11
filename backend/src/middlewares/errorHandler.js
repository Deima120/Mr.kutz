/**
 * Middleware global de manejo de errores
 * Centraliza el manejo de errores y respuestas consistentes
 */

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err?.message || err);
  if (err?.stack) console.error('Stack:', err.stack);

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

  // Error por defecto
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};
