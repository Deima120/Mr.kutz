/**
 * Rutas de pagos
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

const createValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('El monto debe ser mayor o igual a 0.'),
  body('paymentMethodId').isInt({ min: 1 }).withMessage('Indica un método de pago válido.'),
  body('appointmentId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('productId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('productQuantity').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('reference').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('notes').optional({ checkFalsy: true }).trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de pago no válido.');

const voidValidation = [
  idParam,
  body('voidReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/methods', paymentController.getPaymentMethods);
router.get('/total', paymentController.getTotal);
router.get('/', paymentController.getAll);
router.post('/:id/void', voidValidation, validate, paymentController.voidPayment);
router.get('/:id', idParam, validate, paymentController.getById);
router.post('/', createValidation, validate, paymentController.create);

export default router;
