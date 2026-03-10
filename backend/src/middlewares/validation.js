/**
 * Middleware de validación con express-validator
 * Procesa errores de validación y devuelve respuestas consistentes
 */

import { validationResult } from 'express-validator';

/**
 * Ejecuta validaciones y devuelve errores si existen
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};
