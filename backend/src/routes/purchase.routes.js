import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as purchaseController from '../controllers/purchase.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de compra no válido.');

const createValidation = [
  body('supplierName').optional().trim().isLength({ max: 150 }),
  body('invoiceNumber').optional().trim().isLength({ max: 80 }),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('Debes incluir al menos un artículo.'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Producto no válido.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad no válida.'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('Costo unitario no válido.'),
];

const voidValidation = [
  idParam,
  body('voidReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', purchaseController.getAll);
router.post('/:id/void', voidValidation, validate, purchaseController.voidPurchase);
router.get('/:id', idParam, validate, purchaseController.getById);
router.post('/', createValidation, validate, purchaseController.create);

export default router;
