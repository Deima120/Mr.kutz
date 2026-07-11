/**
 * Rutas de barberos
 * Solo admin puede crear/editar barberos
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import {
  strongPassword,
  personNameField,
  optionalPersonNameField,
  optionalPhoneField,
  documentTypeField,
  documentNumberField,
} from '../utils/validation.js';
import * as barberController from '../controllers/barber.controller.js';

const router = express.Router();

const createValidation = [
  body('email').isEmail().normalizeEmail(),
  ...strongPassword('password'),
  personNameField('firstName', 'El nombre'),
  personNameField('lastName', 'El apellido'),
  optionalPhoneField('phone'),
  documentTypeField('documentType'),
  documentNumberField('documentNumber'),
  body('specialties').optional({ checkFalsy: true }).isArray(),
  body('specialties.*').optional().trim().isLength({ max: 80 }),
];

const updateValidation = [
  optionalPersonNameField('firstName', 'El nombre'),
  optionalPersonNameField('lastName', 'El apellido'),
  optionalPhoneField('phone'),
  documentTypeField('documentType'),
  documentNumberField('documentNumber'),
  body('specialties').optional({ checkFalsy: true }).isArray(),
  body('specialties.*').optional().trim().isLength({ max: 80 }),
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
  body('schedules.*').custom((row) => {
    if (!row?.isAvailable) return true;
    const start = String(row.startTime || '').trim();
    const end = String(row.endTime || '').trim();
    if (!start || !end) {
      throw new Error('Indica hora de inicio y cierre para los días disponibles.');
    }
    if (start >= end) {
      throw new Error('La hora de inicio debe ser anterior a la de cierre.');
    }
    return true;
  }),
];

router.use(auth);

router.get('/', authorize('admin', 'barber', 'client'), barberController.getAll);
router.get('/:id/schedules', authorize('admin', 'barber', 'client'), idParam, validate, barberController.getSchedules);
router.get('/:id', authorize('admin', 'barber', 'client'), idParam, validate, barberController.getById);

router.post('/', authorize('admin'), createValidation, validate, barberController.create);
router.put('/:id', authorize('admin'), [idParam, ...updateValidation], validate, barberController.update);
router.put('/:id/schedules', authorize('admin'), [idParam, ...schedulesValidation], validate, barberController.updateSchedules);

export default router;
