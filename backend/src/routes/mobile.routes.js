/**
 * Rutas específicas para la app móvil
 * Prefijo: /api/mobile
 *
 * En esta primera versión se cubren:
 * - Subproceso de acceso (login, perfil)
 * - Subproceso de cliente (disponibilidad y manejo de citas)
 */

import express from 'express';
import { body, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as authController from '../controllers/auth.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';

const router = express.Router();

// ====== AUTH MÓVIL ======

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/auth/login', loginValidation, validate, authController.login);
router.get('/auth/me', auth, authController.getProfile);

// ====== CLIENTE (requiere rol client) ======

router.use('/client', auth, authorize('client'));

// Disponibilidad por barbero y fecha
router.get(
  '/client/availability',
  [
    query('barberId').isInt({ min: 1 }).withMessage('Valid barberId is required'),
    query('date').isISO8601().withMessage('Valid date (YYYY-MM-DD) is required'),
  ],
  validate,
  appointmentController.getAvailableSlots,
);

// Listar citas del cliente autenticado (historial / próximas)
router.get('/client/appointments', appointmentController.getAll);

// Crear cita rápida desde el cliente autenticado
router.post(
  '/client/appointments',
  [
    body('barberId').isInt({ min: 1 }).withMessage('Valid barber required'),
    body('serviceId').isInt({ min: 1 }).withMessage('Valid service required'),
    body('appointmentDate').isISO8601().withMessage('Valid date required'),
    body('startTime')
      .optional()
      .trim()
      .matches(/^\d{1,2}:\d{2}$/)
      .withMessage('Time format must be HH:MM'),
    body('notes').optional().trim(),
  ],
  validate,
  appointmentController.create,
);

export default router;

