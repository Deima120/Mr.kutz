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
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 150 }),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0.'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('La duración debe ser de al menos 1 minuto.'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ max: 150 }),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de servicio no válido.');

router.get('/', serviceController.getAll);
router.get('/:id', idParam, validate, serviceController.getById);

router.use(auth);
router.use(authorize('admin', 'barber'));

router.post('/', createValidation, validate, serviceController.create);
router.put('/:id', [idParam, ...updateValidation], validate, serviceController.update);
router.delete('/:id', idParam, validate, serviceController.remove);

export default router;
