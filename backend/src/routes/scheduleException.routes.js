/**
 * Rutas de excepciones del calendario (cierres y horarios especiales).
 *
 * Lectura abierta a todo el personal y a los clientes autenticados: la agenda y
 * el asistente de reserva necesitan saber qué días están cerrados. La escritura
 * es exclusiva del administrador.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as scheduleExceptionController from '../controllers/scheduleException.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de excepción no válido.');

const upsertValidation = [
  body('date').isISO8601().withMessage('Indica una fecha válida (AAAA-MM-DD).'),
  body('isClosed').optional().isBoolean().withMessage('Estado no válido.').toBoolean(),
  body('startTime')
    .optional({ checkFalsy: true })
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  body('endTime')
    .optional({ checkFalsy: true })
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
];

router.use(auth);

router.get(
  '/calendar',
  authorize('admin', 'barber', 'client'),
  [query('year').optional().isInt({ min: 1900, max: 2200 })],
  validate,
  scheduleExceptionController.getCalendar,
);

router.get(
  '/',
  authorize('admin', 'barber', 'client'),
  [
    query('from').optional({ checkFalsy: true }).isISO8601(),
    query('to').optional({ checkFalsy: true }).isISO8601(),
  ],
  validate,
  scheduleExceptionController.getAll,
);

router.post('/', authorize('admin'), upsertValidation, validate, scheduleExceptionController.upsert);

router.delete('/:id', authorize('admin'), idParam, validate, scheduleExceptionController.remove);

export default router;
