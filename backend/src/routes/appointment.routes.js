/**
 * Rutas de citas
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as appointmentController from '../controllers/appointment.controller.js';

const router = express.Router();

const createValidation = [
  body('clientId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Indica un cliente válido.'),
  body('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
  body('serviceId').isInt({ min: 1 }).withMessage('Indica un servicio válido.'),
  body('appointmentDate').isDate().withMessage('Indica una fecha válida.'),
  body('startTime')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  body('notes').optional({ checkFalsy: true }).trim(),
];

const updateValidation = [
  body('appointmentDate').optional({ checkFalsy: true }).isDate(),
  body('startTime')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{1,2}:\d{2}$/),
  body('status').optional({ checkFalsy: true }).isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('notes').optional({ checkFalsy: true }).trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de cita no válido.');

const clientRatingBody = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La valoración debe ser un entero entre 1 y 5.'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('El comentario supera el máximo permitido.'),
];

/**
 * Público: resumen de satisfacción para la landing (antes de auth).
 * Rutas literales antes de `/:id` para no capturar "public-satisfaction" como id.
 */
router.get(
  '/public-satisfaction',
  [query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 48 }).withMessage('limit no válido (1–48).')],
  validate,
  appointmentController.getPublicRatingSummary,
);

router.use(auth);
router.use(authorize('admin', 'barber', 'client'));

/**
 * Rutas literales y segmentos fijos antes de `/:id` para que Express no interprete
 * "slots", "rating-summary" o `…/rating` como IDs.
 */
router.get('/', appointmentController.getAll);
router.get('/slots', appointmentController.getAvailableSlots);
router.get(
  '/rating-summary',
  authorize('admin', 'barber'),
  [
    query('barberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('barberId no válido.'),
    query('days').optional({ values: 'falsy' }).trim(),
  ],
  validate,
  appointmentController.getRatingSummary,
);
router.post(
  '/:id/rating',
  authorize('client'),
  idParam,
  clientRatingBody,
  validate,
  appointmentController.submitClientRating,
);
router.get('/:id', idParam, validate, appointmentController.getById);
router.post('/', createValidation, validate, appointmentController.create);
router.put('/:id', [idParam, ...updateValidation], validate, appointmentController.update);

export default router;
