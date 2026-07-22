/**
 * Rutas del Dashboard
 */

import express from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery } from '../utils/validation.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

const dateRangeValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
];

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/stats', dateRangeValidation, validate, dashboardController.getStats);
router.get('/report', authorize('admin'), dateRangeValidation, validate, dashboardController.getReport);

export default router;
