/**
 * Rutas de configuración (Settings)
 * Solo admin puede modificar
 */

import express from 'express';
import { body } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = express.Router();

const updateValidation = [
  body('business_name').optional().trim().isLength({ max: 150 }),
  body('logo_url').optional().trim().isLength({ max: 500 }),
  body('primary_color').optional().trim().isLength({ max: 20 }),
  body('secondary_color').optional().trim().isLength({ max: 20 }),
  body('contact_email').optional({ checkFalsy: true }).trim().isEmail(),
  body('contact_phone').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim(),
  body('opening_hours').optional().trim(),
];

router.get('/public', settingsController.getPublicSettings);
router.get('/', auth, settingsController.getSettings);
router.put('/', auth, authorize('admin'), updateValidation, validate, settingsController.updateSettings);

export default router;
