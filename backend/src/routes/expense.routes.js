/**
 * Rutas de gastos operativos (admin).
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as expenseController from '../controllers/expense.controller.js';

const router = express.Router();

const categoryIdParam = param('id').isInt({ min: 1 }).withMessage('ID de categoría no válido.');
const expenseIdParam = param('id').isInt({ min: 1 }).withMessage('ID de gasto no válido.');

const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 100 }),
  body('sortOrder').optional({ checkFalsy: true }).isInt().withMessage('sortOrder no válido.'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano.'),
];

const updateCategoryValidation = [
  categoryIdParam,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede quedar vacío.')
    .isLength({ max: 100 }),
  body('sortOrder').optional({ checkFalsy: true }).isInt().withMessage('sortOrder no válido.'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano.'),
];

const createExpenseValidation = [
  body('categoryId').isInt({ min: 1 }).withMessage('Indica una categoría válida.'),
  body('amount').isFloat({ gt: 0 }).withMessage('El monto del gasto debe ser mayor a 0.'),
  body('expenseDate')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Indica una fecha de gasto válida (YYYY-MM-DD).'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('attachmentUrl').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const voidExpenseValidation = [
  expenseIdParam,
  body('voidReason')
    .trim()
    .notEmpty()
    .withMessage('El motivo de anulación es obligatorio.')
    .isLength({ max: 500 }),
];

const listExpensesValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('categoryId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Categoría no válida.'),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'voided'])
    .withMessage('Estado de gasto no válido.'),
  ...paginationQuery({ maxLimit: 100 }),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/categories', expenseController.listCategories);
router.post('/categories', createCategoryValidation, validate, expenseController.createCategory);
router.put(
  '/categories/:id',
  updateCategoryValidation,
  validate,
  expenseController.updateCategory
);

router.get('/', listExpensesValidation, validate, expenseController.listExpenses);
router.post('/', createExpenseValidation, validate, expenseController.createExpense);
router.post('/:id/void', voidExpenseValidation, validate, expenseController.voidExpense);

export default router;
