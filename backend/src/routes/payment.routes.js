/**
 * Rutas de pagos
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

const createValidation = [
  body().custom((_, { req }) => {
    const hasMethod =
      req.body?.paymentMethodId != null && String(req.body.paymentMethodId).trim() !== '';
    const hasSplits =
      Array.isArray(req.body?.methodSplits) && req.body.methodSplits.length > 0;
    if (!hasMethod && !hasSplits) {
      throw new Error('Indica un método de pago válido.');
    }
    return true;
  }),
  body('paymentMethodId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Indica un método de pago válido.'),
  body('methodSplits')
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage('methodSplits debe tener entre 1 y 20 métodos.'),
  body('methodSplits.*.paymentMethodId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Método de pago no válido en methodSplits.'),
  body('methodSplits.*.amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Cada método debe tener un monto mayor a 0.'),
  body('amountTendered')
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage('El monto recibido debe ser mayor a 0.'),
  body('amount').custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      throw new Error('El monto del cobro no se envía manualmente; se calcula desde las líneas.');
    }
    return true;
  }),
  body('appointmentId').custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      throw new Error('Usa lines[] con type service; appointmentId en cabecera ya no es válido.');
    }
    return true;
  }),
  body('productId').custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      throw new Error('Usa lines[] con type product; productId en cabecera ya no es válido.');
    }
    return true;
  }),
  body('productQuantity').custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      throw new Error('Usa lines[].quantity; productQuantity en cabecera ya no es válido.');
    }
    return true;
  }),
  body('lines').isArray({ min: 1, max: 100 }).withMessage('Incluye entre 1 y 100 líneas.'),
  body('lines.*.type')
    .isIn(['service', 'product', 'manual'])
    .withMessage('Tipo de línea no válido.'),
  body('lines.*.appointmentId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('lines.*.productId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('lines.*.quantity').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('lines.*.unitPrice').optional({ checkFalsy: true }).isFloat({ gt: 0 }),
  body('lines.*.description').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('reference').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de pago no válido.');
const lineIdParam = param('lineId').isInt({ min: 1 }).withMessage('ID de línea no válido.');

const voidValidation = [
  idParam,
  body('voidReason')
    .trim()
    .notEmpty()
    .withMessage('El motivo de anulación es obligatorio.')
    .isLength({ max: 500 }),
];

const voidLineValidation = [
  idParam,
  lineIdParam,
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
  query('appointmentId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Cita no válida.'),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'voided'])
    .withMessage('Estado de pago no válido.'),
  query('paymentMethodId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Método de pago no válido.'),
  query('type')
    .optional({ checkFalsy: true })
    .isIn(['service', 'product', 'cash', 'mixed'])
    .withMessage('Tipo de pago no válido.'),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  ...paginationQuery({ maxLimit: 100 }),
];

const totalValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
];

router.use(auth);
// Entrar exige poder consultar el modulo; escribir exige poder gestionarlo.
// Sustituye al antiguo authorize('admin'): ahora un rol nuevo de solo lectura
// (p. ej. Contador) puede consultar sin poder modificar nada.
router.use(requirePermission('payments.view', 'payments.manage'));
router.use((req, res, next) =>
  req.method === 'GET' ? next() : requirePermission('payments.manage')(req, res, next)
);

router.get('/methods', paymentController.getPaymentMethods);
router.get('/total', totalValidation, validate, paymentController.getTotal);
router.get('/', listValidation, validate, paymentController.getAll);
router.post('/:id/lines/:lineId/void', voidLineValidation, validate, paymentController.voidPaymentLine);
router.post('/:id/void', voidValidation, validate, paymentController.voidPayment);
router.get('/:id', idParam, validate, paymentController.getById);
router.post('/', createValidation, validate, paymentController.create);

export default router;
