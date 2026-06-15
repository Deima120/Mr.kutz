/**
 * Rutas de productos e inventario
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as productController from '../controllers/product.controller.js';

const router = express.Router();

const createValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim(),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('minStock').optional().isInt({ min: 0 }),
  body('categoryId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const n = parseInt(value, 10);
      if (!Number.isFinite(n) || n < 1) throw new Error('Categoría no válida.');
      return true;
    }),
  body('retailPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }),
];

const updateValidation = [
  body('name').optional().trim().isLength({ max: 150 }),
  body('description').optional().trim(),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('minStock').optional().isInt({ min: 0 }),
  body('categoryId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const n = parseInt(value, 10);
      if (!Number.isFinite(n) || n < 1) throw new Error('Categoría no válida.');
      return true;
    }),
  body('isActive').optional().isBoolean(),
  body('retailPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }),
];

const stockValidation = [
  body('quantityChange')
    .isInt()
    .withMessage('Indica el cambio de cantidad.')
    .custom((value) => {
      if (parseInt(value, 10) === 0) {
        throw new Error('El cambio de cantidad no puede ser cero.');
      }
      return true;
    }),
  body('movementType').optional().isIn(['purchase', 'sale', 'adjustment', 'damage']),
  body('notes').optional().trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de producto no válido.');

const movementIdParam = param('movementId').isInt({ min: 1 }).withMessage('ID de movimiento no válido.');

const voidMovementValidation = [
  movementIdParam,
  body('voidReason').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const importValidation = [
  body('rows').isArray({ min: 1, max: 200 }).withMessage('Envía entre 1 y 200 filas.'),
  body('rows.*.name').trim().notEmpty().withMessage('Cada fila debe tener nombre.'),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/insights', productController.getInsights);
router.get('/low-stock', productController.getLowStock);
router.post('/import', importValidation, validate, productController.importProducts);
router.post('/movements/:movementId/void', voidMovementValidation, validate, productController.voidMovement);
router.get('/', productController.getAll);
router.get('/:id/movements', idParam, validate, productController.getMovements);
router.get('/:id', idParam, validate, productController.getById);
router.post('/', createValidation, validate, productController.create);
router.put('/:id', [idParam, ...updateValidation], validate, productController.update);
router.put('/:id/stock', [idParam, ...stockValidation], validate, productController.updateStock);

export default router;
