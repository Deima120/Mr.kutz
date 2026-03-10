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
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  body('paymentMethodId').isInt({ min: 1 }).withMessage('Valid payment method required'),
  body('appointmentId').optional().isInt({ min: 1 }),
  body('reference').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid payment ID');

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/methods', paymentController.getPaymentMethods);
router.get('/total', paymentController.getTotal);
router.get('/', paymentController.getAll);
router.get('/:id', idParam, validate, paymentController.getById);
router.post('/', createValidation, validate, paymentController.create);
router.delete('/:id', idParam, validate, paymentController.remove);

export default router;
