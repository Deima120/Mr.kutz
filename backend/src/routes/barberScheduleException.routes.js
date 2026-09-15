/**
 * Ausencias puntuales de barbero (vacaciones, incapacidad, permiso, festivo).
 *
 * Reutiliza el permiso `barbers.schedules.manage` en vez de crear uno nuevo:
 * es la misma responsabilidad que ya protege la plantilla semanal
 * (`PUT /barbers/:id/schedules`), solo que para fechas puntuales.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { BARBER_ABSENCE_TYPES } from '../services/barberScheduleRules.js';
import * as exceptionController from '../controllers/barberScheduleException.controller.js';

const router = express.Router();

const ymdField = (name) =>
  body(name)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${name} debe tener formato AAAA-MM-DD.`);

const listValidation = [
  query('barberId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('from').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/),
  query('to').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/),
  query('includeCancelled').optional().isIn(['true', 'false']),
];

const createValidation = [
  body('applyToAllBarbers').optional().isBoolean(),
  body('barberId').custom((value, { req }) => {
    if (req.body.applyToAllBarbers === true || req.body.applyToAllBarbers === 'true') return true;
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) throw new Error('Indica un barbero válido.');
    return true;
  }),
  ymdField('dateFrom'),
  ymdField('dateTo'),
  body('type').isIn(BARBER_ABSENCE_TYPES).withMessage('Tipo de ausencia no válido.'),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('confirmed').optional().isBoolean(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de ausencia no válido.');
const batchIdParam = param('batchId').isUUID().withMessage('Lote no válido.');

router.use(auth);
router.use(requirePermission('barbers.schedules.manage'));

router.get('/', listValidation, validate, exceptionController.list);
router.post('/', createValidation, validate, exceptionController.create);
router.post('/:id/cancel', idParam, validate, exceptionController.cancel);
router.post('/batch/:batchId/cancel', batchIdParam, validate, exceptionController.cancelBatch);

export default router;
