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
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 150 }),
  body('description').optional().trim(),
  body('sku').optional().trim().isLength({ max: 50 }),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('minStock').optional().isInt({ min: 0 }),
];

const updateValidation = [
  body('name').optional().trim().isLength({ max: 150 }),
  body('description').optional().trim(),
  body('sku').optional().trim().isLength({ max: 50 }),
  body('unit').optional().trim().isLength({ max: 20 }),
  body('minStock').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
];

const stockValidation = [
  body('quantityChange').isInt().withMessage('Quantity change required'),
  body('movementType').optional().isIn(['purchase', 'sale', 'adjustment', 'damage']),
  body('notes').optional().trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid product ID');

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/', productController.getAll);
router.get('/low-stock', productController.getLowStock);
router.get('/:id/movements', idParam, validate, productController.getMovements);
router.get('/:id', idParam, validate, productController.getById);
router.post('/', createValidation, validate, productController.create);
router.put('/:id', [idParam, ...updateValidation], validate, productController.update);
router.put('/:id/stock', [idParam, ...stockValidation], validate, productController.updateStock);
router.delete('/:id', idParam, validate, productController.remove);

export default router;
