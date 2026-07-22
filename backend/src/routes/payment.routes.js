/**
 * Rutas de pagos
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

const createValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a 0.'),
  body('paymentMethodId').isInt({ min: 1 }).withMessage('Indica un método de pago válido.'),
  body('appointmentId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('productId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('productQuantity').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('reference').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de pago no válido.');

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
    .isIn(['service', 'product', 'cash'])
    .withMessage('Tipo de pago no válido.'),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  ...paginationQuery({ maxLimit: 100 }),
];

const totalValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
];

router.use(auth);
// Alineado con la UI: solo admin gestiona pagos, ventas de producto y stock.
router.use(authorize('admin'));

router.get('/methods', paymentController.getPaymentMethods);
router.get('/total', totalValidation, validate, paymentController.getTotal);
router.get('/', listValidation, validate, paymentController.getAll);
router.post('/:id/void', voidValidation, validate, paymentController.voidPayment);
router.get('/:id', idParam, validate, paymentController.getById);
router.post('/', createValidation, validate, paymentController.create);

export default router;
