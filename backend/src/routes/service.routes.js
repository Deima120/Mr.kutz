/**
 * Rutas de servicios (catálogo)
 * GET sin auth (para seleccionar al agendar), CRUD con auth
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as serviceController from '../controllers/service.controller.js';

const router = express.Router();

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 150 }),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be >= 1'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ max: 150 }),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid service ID');

router.get('/', serviceController.getAll);
router.get('/:id', idParam, validate, serviceController.getById);

router.use(auth);
router.use(authorize('admin', 'barber'));

router.post('/', createValidation, validate, serviceController.create);
router.put('/:id', [idParam, ...updateValidation], validate, serviceController.update);
router.delete('/:id', idParam, validate, serviceController.remove);

export default router;
