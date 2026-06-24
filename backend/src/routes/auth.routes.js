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
import { loginThrottle } from '../middlewares/loginThrottle.js';
import { publicThrottle } from '../middlewares/publicThrottle.js';
import { strongPassword } from '../utils/validation.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Indica un correo electrónico válido.')
    .normalizeEmail(),
  ...strongPassword('password'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre es demasiado largo.'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El apellido es demasiado largo.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('documentType')
    .trim()
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio.')
    .isLength({ max: 40 }),
  body('documentNumber')
    .trim()
    .notEmpty()
    .withMessage('El número de documento es obligatorio.')
    .isLength({ max: 80 }),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['client'])
    .withMessage('El registro público solo admite el rol cliente.'),
];

// Validaciones para login
const loginValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
];

// Validaciones para forgot password
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
];

// Validaciones para verify code
const verifyCodeValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('El código debe tener 6 dígitos.'),
];

// Validaciones para reset password
const resetPasswordValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('El código debe tener 6 dígitos.'),
  ...strongPassword('newPassword'),
];

const forgotPasswordThrottle = publicThrottle({
  scope: 'forgot-password',
  max: 5,
  windowMs: 15 * 60 * 1000,
});

const resetVerifyThrottle = publicThrottle({
  scope: 'reset-verify',
  max: 12,
  windowMs: 15 * 60 * 1000,
});

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginThrottle, loginValidation, validate, authController.login);
router.get('/me', auth, authController.getProfile);
router.post('/forgot-password', forgotPasswordThrottle, forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/verify-code', resetVerifyThrottle, verifyCodeValidation, validate, authController.verifyResetCode);
router.post('/reset-password', resetVerifyThrottle, resetPasswordValidation, validate, authController.resetPassword);

export default router;
