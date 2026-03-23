import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as purchaseController from '../controllers/purchase.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid purchase ID');

const createValidation = [
  body('supplierName').optional().trim().isLength({ max: 150 }),
  body('invoiceNumber').optional().trim().isLength({ max: 80 }),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('Items are required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('Invalid unit cost'),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', purchaseController.getAll);
router.get('/:id', idParam, validate, purchaseController.getById);
router.post('/', createValidation, validate, purchaseController.create);

export default router;
