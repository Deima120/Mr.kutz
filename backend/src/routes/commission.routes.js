/**
 * Rutas de comisiones (admin).
 */

import express from 'express';
import { query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
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
// Entrar exige poder consultar el modulo; escribir exige poder gestionarlo.
// Sustituye al antiguo authorize('admin'): ahora un rol nuevo de solo lectura
// (p. ej. Contador) puede consultar sin poder modificar nada.
router.use(requirePermission('commissions.view', 'commissions.manage'));
router.use((req, res, next) =>
  req.method === 'GET' ? next() : requirePermission('commissions.manage')(req, res, next)
);

router.get('/', listValidation, validate, commissionController.list);

export default router;
