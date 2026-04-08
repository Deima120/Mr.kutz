import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as categoryController from '../controllers/product-category.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de categoría no válido.');

const createValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 100 }),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
];

const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede quedar vacío.').isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim(),
  body('isActive').optional().isBoolean(),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', categoryController.getAll);
router.get('/:id', idParam, validate, categoryController.getById);
router.post('/', createValidation, validate, categoryController.create);
router.put('/:id', [idParam, ...updateValidation], validate, categoryController.update);
router.delete('/:id', idParam, validate, categoryController.remove);

export default router;
