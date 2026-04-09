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
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('firstName').trim().notEmpty().isLength({ max: 100 }),
  body('lastName').trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('documentType')
    .trim()
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio.')
    .isLength({ max: 40 }),
  body('documentNumber')
    .trim()
    .notEmpty()
    .withMessage('El número de documento es obligatorio.')
    .isLength({ max: 80 }),
  body('specialties').optional({ checkFalsy: true }).isArray(),
];

const updateValidation = [
  body('firstName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('lastName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('documentType')
    .trim()
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio.')
    .isLength({ max: 40 }),
  body('documentNumber')
    .trim()
    .notEmpty()
    .withMessage('El número de documento es obligatorio.')
    .isLength({ max: 80 }),
  body('specialties').optional({ checkFalsy: true }).isArray(),
  body('isActive').optional({ checkFalsy: true }).isBoolean(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de barbero no válido.');

const schedulesValidation = [
  body('schedules')
    .isArray()
    .withMessage('Los horarios deben enviarse como lista (array).'),
  body('schedules.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('El día de la semana debe ser un número entre 0 y 6.'),
  body('schedules.*.startTime')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora de inicio debe tener formato HH:MM.'),
  body('schedules.*.endTime')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora de fin debe tener formato HH:MM.'),
  body('schedules.*.isAvailable')
    .optional({ checkFalsy: true })
    .isBoolean(),
];

router.use(auth);

// Listar barberos: admin, barber y client (el cliente los necesita para agendar)
router.get('/', authorize('admin', 'barber', 'client'), barberController.getAll);
router.get('/:id/schedules', authorize('admin', 'barber', 'client'), idParam, validate, barberController.getSchedules);
router.get('/:id', authorize('admin', 'barber', 'client'), idParam, validate, barberController.getById);

router.post('/', authorize('admin'), createValidation, validate, barberController.create);
router.put('/:id', authorize('admin'), [idParam, ...updateValidation], validate, barberController.update);
router.put('/:id/schedules', authorize('admin'), [idParam, ...schedulesValidation], validate, barberController.updateSchedules);

export default router;
