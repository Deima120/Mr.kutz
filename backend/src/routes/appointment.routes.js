/**
 * Rutas de citas
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { publicThrottle } from '../middlewares/publicThrottle.js';
import {
  personNameField,
  optionalPhoneField,
  optionalNotesField,
  optionalDateQuery,
  paginationQuery,
} from '../utils/validation.js';
import {
  APPOINTMENT_HORIZON_DAYS_PUBLIC,
  appointmentDateBody,
  appointmentSlotDateQuery,
  dateRangeOrderQuery,
  horizonDaysForRole,
} from '../utils/dateRange.js';
import * as appointmentController from '../controllers/appointment.controller.js';
import * as publicBookingController from '../controllers/publicBooking.controller.js';

const router = express.Router();

const staffHorizon = (req) => horizonDaysForRole(req.user?.role);

const createValidation = [
  body('clientId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Indica un cliente válido.'),
  body('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
  body('serviceId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Indica un servicio válido.'),
  body('serviceIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Indica al menos un servicio.'),
  body('serviceIds.*').optional().isInt({ min: 1 }).withMessage('Servicio no válido.'),
  appointmentDateBody({ getHorizonDays: staffHorizon }),
  body('startTime')
    .trim()
    .notEmpty()
    .withMessage('La hora de inicio es obligatoria.')
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  optionalNotesField('notes', 500),
];

const updateValidation = [
  body('clientId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('barberId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('serviceId').optional({ checkFalsy: true }).isInt({ min: 1 }),
  body('serviceIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Indica al menos un servicio.'),
  body('serviceIds.*').optional().isInt({ min: 1 }).withMessage('Servicio no válido.'),
  appointmentDateBody({ getHorizonDays: staffHorizon, optional: true }),
  body('startTime')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('La hora de inicio es obligatoria.')
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  body('status').optional({ checkFalsy: true }).isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  optionalNotesField('notes', 500),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de cita no válido.');

const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

const listValidation = [
  query('date').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha no válida.'),
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('barberId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Barbero no válido.'),
  query('clientId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Cliente no válido.'),
  // Acepta un estado o varios separados por coma (OR), p.ej. scheduled,confirmed,in_progress
  query('status')
    .optional({ checkFalsy: true })
    .custom((value) => {
      const parts = String(value)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.length) return false;
      return parts.every((s) => APPOINTMENT_STATUSES.includes(s));
    })
    .withMessage('Estado de cita no válido.'),
  ...paginationQuery({ maxLimit: 200 }),
];

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

/**
 * Reservas públicas (sin autenticación). Protegidas con rate-limit en memoria.
 */
const publicBookingValidation = [
  personNameField('firstName', 'El nombre'),
  personNameField('lastName', 'El apellido'),
  body('email')
    .isEmail()
    .withMessage('Indica un correo electrónico válido.')
    .normalizeEmail(),
  optionalPhoneField('phone'),
  body('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
  body('serviceIds')
    .optional({ values: 'falsy' })
    .isArray({ min: 1, max: 3 })
    .withMessage('Indica entre 1 y 3 servicios.'),
  body('serviceIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cada servicio debe ser un identificador válido.'),
  body('serviceId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Indica un servicio válido.'),
  body().custom((_, { req }) => {
    const ids = req.body?.serviceIds;
    const one = req.body?.serviceId;
    if (Array.isArray(ids) && ids.length >= 1 && ids.length <= 3) return true;
    if (one != null && one !== '') return true;
    throw new Error('Indica entre 1 y 3 servicios.');
  }),
  appointmentDateBody({ getHorizonDays: () => APPOINTMENT_HORIZON_DAYS_PUBLIC }),
  body('startTime')
    .trim()
    .notEmpty()
    .withMessage('La hora de inicio es obligatoria.')
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('La hora debe tener formato HH:MM.'),
  optionalNotesField('notes', 500),
];

router.get('/public/barbers', publicBookingController.listBarbers);
router.get('/public/services', publicBookingController.listServices);
router.get(
  '/public/slots',
  [
    query('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
    query('date').isDate().withMessage('Indica una fecha válida.'),
    appointmentSlotDateQuery({ getHorizonDays: () => APPOINTMENT_HORIZON_DAYS_PUBLIC }),
    query('durationMinutes').optional({ values: 'falsy' }).isInt({ min: 5, max: 480 }).withMessage('Duración no válida (mín. 5 min).'),
  ],
  validate,
  publicBookingController.getSlots,
);
router.post(
  '/public',
  publicThrottle({
    scope: 'public-booking',
    // En local se prueba mucho; en producción se mantiene un tope más estricto.
    max: process.env.NODE_ENV === 'production' ? 12 : 60,
    windowMs: 10 * 60 * 1000,
  }),
  publicBookingValidation,
  validate,
  publicBookingController.createBooking,
);

router.use(auth);
router.use(authorize('admin', 'barber', 'client'));

/**
 * Rutas literales y segmentos fijos antes de `/:id` para que Express no interprete
 * "slots", "rating-summary" o `…/rating` como IDs.
 */
router.get('/', listValidation, validate, appointmentController.getAll);
router.get('/slots', [
  query('barberId').isInt({ min: 1 }).withMessage('Indica un barbero válido.'),
  query('date').isDate().withMessage('Indica una fecha válida.'),
  appointmentSlotDateQuery({ getHorizonDays: staffHorizon }),
  query('durationMinutes').optional({ values: 'falsy' }).isInt({ min: 5, max: 480 }).withMessage('Duración no válida (mín. 5 min).'),
], validate, appointmentController.getAvailableSlots);
router.get(
  '/rating-summary',
  authorize('admin', 'barber'),
  [
    query('barberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('barberId no válido.'),
    query('days')
      .optional({ values: 'falsy' })
      .custom((value) => {
        if (value === 'all') return true;
        const n = parseInt(String(value), 10);
        if (Number.isFinite(n) && n >= 1 && n <= 3650) return true;
        throw new Error('days debe ser "all" o un entero entre 1 y 3650.');
      }),
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
router.post('/', authorize('admin', 'client'), createValidation, validate, appointmentController.create);
router.put('/:id', authorize('admin', 'client'), [idParam, ...updateValidation], validate, appointmentController.update);

export default router;
