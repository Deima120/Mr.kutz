/**
 * Rutas de fidelización: configuración de hitos y consulta del historial global.
 * Solo administrador (`loyalty.view` para leer, `loyalty.manage` para escribir).
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { paginationQuery } from '../utils/validation.js';
import * as loyaltyController from '../controllers/loyalty.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de hito no válido.');
const rewardIdParam = param('id').isInt({ min: 1 }).withMessage('ID de recompensa no válido.');

const optionsValidation = body('options')
  .isArray({ min: 1 })
  .withMessage('Indica al menos una opción de premio para este hito.');

const milestoneCreateValidation = [
  body('everyCount').isInt({ min: 1 }).withMessage('Indica cada cuántos servicios se otorga el hito.'),
  body('label').trim().notEmpty().withMessage('Indica un nombre para el hito.'),
  optionsValidation,
];

const milestoneUpdateValidation = [
  body('everyCount').optional().isInt({ min: 1 }).withMessage('Indica cada cuántos servicios se otorga el hito.'),
  body('label').optional().trim().notEmpty().withMessage('Indica un nombre para el hito.'),
  body('options').optional().isArray({ min: 1 }).withMessage('Indica al menos una opción de premio para este hito.'),
];

const chooseOptionValidation = [
  rewardIdParam,
  body('optionId').isInt({ min: 1 }).withMessage('Indica una opción válida.'),
];

const historyQueryValidation = [
  ...paginationQuery({ maxLimit: 100 }),
  query('clientId').optional().isInt({ min: 1 }).withMessage('ID de cliente no válido.'),
  query('status').optional().isIn(['pending', 'redeemed']).withMessage('Estado no válido.'),
];

router.use(auth);
router.use(requirePermission('loyalty.view', 'loyalty.manage'));
router.use((req, res, next) =>
  req.method === 'GET' ? next() : requirePermission('loyalty.manage')(req, res, next)
);

router.get('/stats', loyaltyController.getStats);
router.get('/milestones', validate, loyaltyController.getMilestoneRules);
router.post('/milestones', milestoneCreateValidation, validate, loyaltyController.createMilestone);
router.put('/milestones/:id', [idParam, ...milestoneUpdateValidation], validate, loyaltyController.updateMilestone);
router.patch('/milestones/:id/deactivate', idParam, validate, loyaltyController.deactivateMilestone);
// Borrado solo para hitos que nunca otorgaron nada (el servicio responde 409 si
// los tiene). La baja habitual sigue siendo desactivar, igual que en Barberos.
router.delete('/milestones/:id', idParam, validate, loyaltyController.deleteMilestone);

router.get('/rewards', historyQueryValidation, validate, loyaltyController.getRewardsHistory);
router.patch('/rewards/:id/choose', chooseOptionValidation, validate, loyaltyController.chooseRewardOption);

export default router;
