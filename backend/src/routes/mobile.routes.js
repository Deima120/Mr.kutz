/**
 * Rutas específicas para la app móvil
 * Prefijo: /api/mobile
 *
 * En esta primera versión se cubren:
 * - Subproceso de acceso (login, perfil)
 * - Subproceso de cliente (disponibilidad, citas y valoración post-cita; misma lógica que `/api/appointments`)
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as authController from '../controllers/auth.controller.js';
import * as appointmentController from '../controllers/appointment.controller.js';

const router = express.Router();

const appointmentIdParam = param('id').isInt({ min: 1 }).withMessage('ID de cita no válido.');

const clientRatingBody = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La valoración debe ser un entero entre 1 y 5.'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('El comentario supera el máximo permitido.'),
];

// ====== AUTH MÓVIL ======

const loginValidation = [
  body('email').isEmail().withMessage('Indica un correo electrónico válido.').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
];

router.post('/auth/login', loginValidation, validate, authController.login);
router.get('/auth/me', auth, authController.getProfile);

// ====== CLIENTE (requiere rol client) ======

router.use('/client', auth, authorize('client'));

// Disponibilidad por barbero y fecha
router.get(
  '/client/availability',
  [
    query('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
    query('date').isISO8601().withMessage('Indica una fecha válida (AAAA-MM-DD).'),
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
    body('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
    body('serviceId').isInt({ min: 1 }).withMessage('Indica un servicio válido.'),
    body('appointmentDate').isISO8601().withMessage('Indica una fecha válida.'),
    body('startTime')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{1,2}:\d{2}$/)
      .withMessage('La hora debe tener formato HH:MM.'),
    body('notes').optional({ checkFalsy: true }).trim(),
  ],
  validate,
  appointmentController.create,
);

/** Misma lógica que POST /api/appointments/:id/rating (valoración en Appointment). */
router.post(
  '/client/appointments/:id/rating',
  [appointmentIdParam, ...clientRatingBody],
  validate,
  appointmentController.submitClientRating,
);

export default router;

