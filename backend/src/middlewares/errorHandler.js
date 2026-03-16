/**
 * Middleware global de manejo de errores
 * Centraliza el manejo de errores y respuestas consistentes.
 * Evita 500 cuando se puede devolver un 4xx con mensaje claro.
 */

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Log interno (nunca exponer stack al cliente)
  console.error(`[${statusCode}] ${req.method} ${req.originalUrl}`, message);
  if (statusCode === 500 && err?.stack) console.error(err.stack);

  // Error de validación (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors,
    });
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Sesión expirada' });
  }

  // Prisma / DB: mapear códigos conocidos a 4xx para no devolver 500
  if (err.code === 'P2025' || err.name === 'NotFoundError') {
    return res.status(404).json({ success: false, message: 'Recurso no encontrado' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'El registro ya existe (duplicado)' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, message: 'Referencia inválida' });
  }
  if (err.code && String(err.code).startsWith('P2')) {
    return res.status(400).json({ success: false, message: 'Error en los datos enviados' });
  }

  // Errores con statusCode ya definido (p. ej. 400, 403)
  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      message: message,
    });
  }

  // Cualquier otro error → 500 con mensaje genérico (no exponer detalles)
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor. Intenta de nuevo más tarde.',
  });
};
