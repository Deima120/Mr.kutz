/**
 * Rutas de clientes
 * Todas requieren autenticación (admin o barber)
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as clientController from '../controllers/client.controller.js';

const router = express.Router();

const clientValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 }),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('email').optional().trim().isEmail().withMessage('Invalid email'),
  body('notes').optional().trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid client ID');

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/', clientController.getAll);
router.get('/:id/history', idParam, validate, clientController.getHistory);
router.get('/:id', idParam, validate, clientController.getById);
router.post('/', clientValidation, validate, clientController.create);
router.put('/:id', [idParam, ...clientValidation], validate, clientController.update);
router.delete('/:id', idParam, validate, clientController.remove);

export default router;
