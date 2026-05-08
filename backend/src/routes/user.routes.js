/**
 * Gestión de Usuarios.
 * Prefijo: /api/usuarios
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de usuario no válido.');

const paginationQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset debe ser mayor o igual a 0.'),
  query('search').optional().trim().isLength({ max: 100 }),
];

const createValidation = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.').isLength({ max: 200 }),
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('rol')
    .optional()
    .trim()
    .isIn(['admin', 'barber', 'client'])
    .withMessage('rol debe ser admin, barber o client.'),
  body('role')
    .optional()
    .trim()
    .isIn(['admin', 'barber', 'client'])
    .withMessage('role debe ser admin, barber o client.'),
  body('contrasenaTemporal')
    .optional()
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres.'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres.'),
];

const updateValidation = [
  body('nombre').optional().trim().isLength({ max: 200 }),
  body('email').optional().isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('rol')
    .optional()
    .trim()
    .isIn(['admin', 'barber', 'client'])
    .withMessage('rol debe ser admin, barber o client.'),
  body('role')
    .optional()
    .trim()
    .isIn(['admin', 'barber', 'client'])
    .withMessage('role debe ser admin, barber o client.'),
];

const stateBody = [
  body('activo')
    .not()
    .isEmpty()
    .withMessage('activo es obligatorio.')
    .isBoolean()
    .withMessage('activo debe ser booleano.'),
];

router.use(auth);
router.use(authorize('admin'));

router.post('/', createValidation, validate, userController.createUser);
router.get('/', paginationQuery, validate, userController.listUsers);
router.get('/:id', idParam, validate, userController.getUserDetail);
router.put('/:id', [idParam, ...updateValidation], validate, userController.updateUser);
router.patch('/:id/estado', [idParam, ...stateBody], validate, userController.changeUserState);

export default router;

