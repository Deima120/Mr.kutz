/**
 * Middleware 404 para rutas no registradas.
 * Debe montarse DESPUÉS de todas las rutas y ANTES del errorHandler.
 */

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'El recurso solicitado no fue encontrado.',
    status: 404,
  });
}
