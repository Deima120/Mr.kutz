/**
 * Rutas de caja (admin).
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as cashRegisterController from '../controllers/cashRegister.controller.js';

const router = express.Router();

const openValidation = [
  body('openingAmount')
    .isFloat({ min: 0 })
    .withMessage('El monto de apertura debe ser ≥ 0.'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const closeValidation = [
  body('countedCash')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('El efectivo contado debe ser ≥ 0.'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de caja no válido.');

const historyValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['OPEN', 'CLOSED'])
    .withMessage('Estado de caja no válido.'),
  ...paginationQuery({ maxLimit: 100 }),
];

router.use(auth);
// Entrar exige poder consultar el modulo; escribir exige poder gestionarlo.
// Sustituye al antiguo authorize('admin'): ahora un rol nuevo de solo lectura
// (p. ej. Contador) puede consultar sin poder modificar nada.
router.use(requirePermission('cash_register.view', 'cash_register.manage'));
router.use((req, res, next) =>
  req.method === 'GET' ? next() : requirePermission('cash_register.manage')(req, res, next)
);

router.get('/current', cashRegisterController.getCurrent);
router.get('/history', historyValidation, validate, cashRegisterController.getHistory);
router.post('/open', openValidation, validate, cashRegisterController.open);
router.post('/close', closeValidation, validate, cashRegisterController.close);
router.get('/:id/summary', idParam, validate, cashRegisterController.getSummary);

export default router;
