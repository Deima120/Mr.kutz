/**
 * Rutas de testimonios
 * GET / → público (solo activos). CRUD con auth admin.
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as testimonialController from '../controllers/testimonial.controller.js';

const router = express.Router();

const createValidation = [
  body('authorName').trim().notEmpty().withMessage('El nombre del autor es obligatorio.').isLength({ max: 100 }),
  body('authorRole').optional().trim().isLength({ max: 50 }),
  body('content').trim().notEmpty().withMessage('El contenido es obligatorio.').isLength({ max: 1000 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const updateValidation = [
  body('authorName').optional().trim().isLength({ max: 100 }),
  body('authorRole').optional().trim().isLength({ max: 50 }),
  body('content').optional().trim().isLength({ max: 1000 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de testimonio no válido.');

router.get('/', testimonialController.getAll);

router.use(auth);
router.use(authorize('admin'));

router.post('/', createValidation, validate, testimonialController.create);
router.get('/:id', idParam, validate, testimonialController.getById);
router.put('/:id', [idParam, ...updateValidation], validate, testimonialController.update);
router.delete('/:id', idParam, validate, testimonialController.remove);

export default router;
