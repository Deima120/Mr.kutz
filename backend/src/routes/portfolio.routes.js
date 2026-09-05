/**
 * Rutas de cartera / portfolio (admin).
 */

import express from 'express';
import { query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as portfolioController from '../controllers/portfolio.controller.js';

const router = express.Router();

const listValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('barberId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('ID de barbero no válido.'),
];

router.use(auth);
router.use(requirePermission('portfolio.manage'));

router.get('/', listValidation, validate, portfolioController.list);

export default router;
