/**
 * Rutas de autenticación
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me (protegida)
 */

import express from 'express';
import { body } from 'express-validator';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name too long'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name too long'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 }),
  body('role')
    .optional()
    .isIn(['admin', 'barber', 'client'])
    .withMessage('Invalid role'),
];

// Validaciones para login
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.get('/me', auth, authController.getProfile);

export default router;
