import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as supplierController from '../controllers/supplier.controller.js';

const router = express.Router();
const idParam = param('id').isInt({ min: 1 }).withMessage('ID de proveedor no válido.');
const listValidation = [
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  query('active').optional().isIn(['true', 'false', 'all']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
];

const fields = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 150 }),
  body('taxId').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body('contactName').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
];

const updateFields = [
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('taxId').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body('contactName').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('isActive').optional().isBoolean(),
];

router.use(auth);
router.use(authorize('admin'));
router.get('/', listValidation, validate, supplierController.getAll);
router.get('/:id', idParam, validate, supplierController.getById);
router.post('/', fields, validate, supplierController.create);
router.put('/:id', [idParam, ...updateFields], validate, supplierController.update);
router.delete('/:id', idParam, validate, supplierController.remove);

export default router;
