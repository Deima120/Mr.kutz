/**
 * Rutas de otros ingresos (admin).
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as otherIncomeController from '../controllers/otherIncome.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de ingreso no válido.');

const createValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('El monto del ingreso debe ser mayor a 0.'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria.')
    .isLength({ max: 200 }),
  body('paymentMethodId').isInt({ min: 1 }).withMessage('Indica un método de pago válido.'),
  body('incomeDate')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Indica una fecha de ingreso válida (YYYY-MM-DD).'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const voidValidation = [
  idParam,
  body('voidReason')
    .trim()
    .notEmpty()
    .withMessage('El motivo de anulación es obligatorio.')
    .isLength({ max: 500 }),
];

const listValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'voided'])
    .withMessage('Estado de ingreso no válido.'),
  query('cashRegisterId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Caja no válida.'),
  query('paymentMethodId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Método de pago no válido.'),
  ...paginationQuery({ maxLimit: 100 }),
];

router.use(auth);
// Entrar exige poder consultar el modulo; escribir exige poder gestionarlo.
// Sustituye al antiguo authorize('admin'): ahora un rol nuevo de solo lectura
// (p. ej. Contador) puede consultar sin poder modificar nada.
router.use(requirePermission('other_incomes.view', 'other_incomes.manage'));
router.use((req, res, next) =>
  req.method === 'GET' ? next() : requirePermission('other_incomes.manage')(req, res, next)
);

router.get('/', listValidation, validate, otherIncomeController.listOtherIncomes);
router.post('/', createValidation, validate, otherIncomeController.createOtherIncome);
router.post('/:id/void', voidValidation, validate, otherIncomeController.voidOtherIncome);

export default router;
