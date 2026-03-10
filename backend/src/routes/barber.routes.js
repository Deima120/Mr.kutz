/**
 * Rutas de barberos
 * Solo admin puede crear/editar barberos
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as barberController from '../controllers/barber.controller.js';

const router = express.Router();

const createValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('firstName').trim().notEmpty().isLength({ max: 100 }),
  body('lastName').trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('specialties').optional().isArray(),
];

const updateValidation = [
  body('firstName').optional().trim().isLength({ max: 100 }),
  body('lastName').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('specialties').optional().isArray(),
  body('isActive').optional().isBoolean(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid barber ID');

router.use(auth);

router.get('/', authorize('admin', 'barber'), barberController.getAll);
router.get('/:id/schedules', authorize('admin', 'barber'), idParam, validate, barberController.getSchedules);
router.get('/:id', authorize('admin', 'barber'), idParam, validate, barberController.getById);

router.post('/', authorize('admin'), createValidation, validate, barberController.create);
router.put('/:id', authorize('admin'), [idParam, ...updateValidation], validate, barberController.update);
router.put('/:id/schedules', authorize('admin'), [idParam], validate, barberController.updateSchedules);

export default router;
