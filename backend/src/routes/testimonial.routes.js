/**
 * Rutas de testimonios
 * GET / → público (solo activos). CRUD con auth admin.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as testimonialController from '../controllers/testimonial.controller.js';

const router = express.Router();

const createValidation = [
  body('authorName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del autor es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre del autor no puede superar 100 caracteres.'),
  body('authorRole').optional().trim().isLength({ max: 50 }),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('El contenido es obligatorio.')
    .isLength({ max: 1000 })
    .withMessage('El contenido no puede superar 1000 caracteres.'),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const updateValidation = [
  body('authorName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del autor no puede quedar vacío.')
    .isLength({ max: 100 }),
  body('authorRole').optional().trim().isLength({ max: 50 }),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El contenido no puede quedar vacío.')
    .isLength({ max: 1000 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de testimonio no válido.');

const listValidation = [
  query('active').optional().isIn(['true', 'false']).withMessage('Filtro active no válido.'),
];

router.get('/', listValidation, validate, testimonialController.getAll);

router.use(auth);
router.use(authorize('admin'));

router.post('/', createValidation, validate, testimonialController.create);
router.get('/:id', idParam, validate, testimonialController.getById);
router.put('/:id', [idParam, ...updateValidation], validate, testimonialController.update);
router.delete('/:id', idParam, validate, testimonialController.remove);

export default router;
