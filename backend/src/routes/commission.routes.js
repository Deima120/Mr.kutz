/**
 * Rutas de comisiones (admin).
 */

import express from 'express';
import { query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';
import { dateRangeOrderQuery } from '../utils/dateRange.js';
import * as commissionController from '../controllers/commission.controller.js';

const router = express.Router();

const listValidation = [
  optionalDateQuery('dateFrom', 'Fecha inicial'),
  optionalDateQuery('dateTo', 'Fecha final'),
  dateRangeOrderQuery(),
  query('barberId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('ID de barbero no válido.'),
  ...paginationQuery({ maxLimit: 200 }),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', listValidation, validate, commissionController.list);

export default router;
