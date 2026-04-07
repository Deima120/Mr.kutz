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
  body('clientId').optional().isInt({ min: 1 }).withMessage('Valid client required'),
  body('barberId').isInt({ min: 1 }).withMessage('Valid barber required'),
  body('serviceId').isInt({ min: 1 }).withMessage('Valid service required'),
  body('appointmentDate').isDate().withMessage('Valid date required'),
  body('startTime').optional().trim().matches(/^\d{1,2}:\d{2}$/).withMessage('Time format HH:MM'),
  body('notes').optional().trim(),
];

const updateValidation = [
  body('appointmentDate').optional().isDate(),
  body('startTime').optional().matches(/^\d{1,2}:\d{2}$/),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('notes').optional().trim(),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid appointment ID');

const clientRatingBody = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment too long'),
];

router.use(auth);
router.use(authorize('admin', 'barber', 'client'));

router.get('/', appointmentController.getAll);
router.get('/slots', appointmentController.getAvailableSlots);
router.get(
  '/rating-summary',
  [
    query('barberId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid barberId'),
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
