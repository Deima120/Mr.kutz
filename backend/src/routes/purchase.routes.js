import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as purchaseController from '../controllers/purchase.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de compra no válido.');

const listValidation = [
  query('dateFrom').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha inicial no válida.'),
  query('dateTo').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha final no válida.'),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'voided', 'draft', 'ordered', 'partially_received', 'received', 'cancelled'])
    .withMessage('Estado de orden no válido.'),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
];

const totalValidation = [
  query('dateFrom').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha inicial no válida.'),
  query('dateTo').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha final no válida.'),
];

const createValidation = [
  body('supplierId').isInt({ min: 1 }).withMessage('Selecciona un proveedor válido.'),
  body('orderNumber').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('invoiceNumber').optional().trim().isLength({ max: 80 }),
  body('expectedAt').optional({ nullable: true }).isISO8601().withMessage('Fecha esperada no válida.'),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('items').isArray({ min: 1, max: 100 }).withMessage('Incluye entre 1 y 100 artículos.'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Producto no válido.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad no válida.'),
  body('items.*.unitCost').isFloat({ min: 0 }).withMessage('Costo unitario no válido.'),
];

const voidValidation = [
  idParam,
  body('voidReason')
    .trim()
    .notEmpty()
    .withMessage('Indica el motivo de cancelación.')
    .isLength({ max: 500 }),
];

const receiptValidation = [
  idParam,
  body('receiptNumber').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('receivedAt').optional().isISO8601().withMessage('Fecha de recepción no válida.'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('items').isArray({ min: 1, max: 100 }).withMessage('Incluye entre 1 y 100 artículos.'),
  body('items.*.purchaseItemId')
    .isInt({ min: 1 })
    .withMessage('Artículo de orden no válido.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad no válida.'),
  body('items.*.unitCost')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Costo unitario no válido.'),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/total', totalValidation, validate, purchaseController.getTotal);
router.get('/', listValidation, validate, purchaseController.getAll);
router.post('/:id/submit', idParam, validate, purchaseController.submit);
router.post('/:id/order', idParam, validate, purchaseController.submit);
router.post('/:id/cancel', voidValidation, validate, purchaseController.cancel);
router.post('/:id/receipts', receiptValidation, validate, purchaseController.receive);
router.post('/:id/void', voidValidation, validate, purchaseController.voidPurchase);
router.get('/:id', idParam, validate, purchaseController.getById);
router.post('/', createValidation, validate, purchaseController.create);

export default router;
