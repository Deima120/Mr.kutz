/**
 * Rutas de autenticación
 * POST /api/auth/register
 * POST /api/auth/check-email
 * POST /api/auth/login
 * GET  /api/auth/me (protegida)
 */

import express from 'express';
import { body } from 'express-validator';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { loginThrottle } from '../middlewares/loginThrottle.js';
import { publicThrottle } from '../middlewares/publicThrottle.js';
import {
  strongPassword,
  personNameField,
  optionalPhoneField,
  documentTypeField,
  documentNumberField,
} from '../utils/validation.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Indica un correo electrónico válido.')
    .normalizeEmail(),
  ...strongPassword('password'),
  personNameField('firstName', 'El nombre'),
  personNameField('lastName', 'El apellido'),
  optionalPhoneField('phone'),
  documentTypeField('documentType'),
  documentNumberField('documentNumber'),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['client'])
    .withMessage('El registro público solo admite el rol cliente.'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
];

const verifyCodeValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('El código debe tener 6 dígitos.'),
];

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

const checkEmailThrottle = publicThrottle({
  scope: 'check-email',
  max: 30,
  windowMs: 15 * 60 * 1000,
});

const checkEmailValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
];

router.post('/check-email', checkEmailThrottle, checkEmailValidation, validate, authController.checkEmail);
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginThrottle, loginValidation, validate, authController.login);
router.get('/me', auth, authController.getProfile);
router.post('/forgot-password', forgotPasswordThrottle, forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/verify-code', resetVerifyThrottle, verifyCodeValidation, validate, authController.verifyResetCode);
router.post('/reset-password', resetVerifyThrottle, resetPasswordValidation, validate, authController.resetPassword);

export default router;
