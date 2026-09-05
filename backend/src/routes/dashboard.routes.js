/**
 * Rutas del Dashboard
 */

import express from 'express';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

const dateRangeValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
];

router.use(auth);
// Quien no tenga el panel general cae al resumen propio del barbero; el
// controlador decide cual, y deniega si no tiene ninguno de los dos.
router.use(requirePermission('dashboard.view.all', 'dashboard.view.own'));

router.get('/stats', dateRangeValidation, validate, dashboardController.getStats);
router.get('/report', requirePermission('dashboard.report'), dateRangeValidation, validate, dashboardController.getReport);

export default router;
