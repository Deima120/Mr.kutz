/**
 * Gestión de Roles y módulos asociados.
 * Prefijo: /api/roles
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as roleController from '../controllers/role.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de rol no válido.');
const moduleIdParam = param('moduleId')
  .isInt({ min: 1 })
  .withMessage('ID de módulo no válido.');

const paginationQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset debe ser mayor o igual a 0.'),
];

const createValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('modules')
    .optional()
    .isArray()
    .withMessage('modules debe ser un arreglo de IDs numéricos.'),
];

const updateValidation = [
  body('name').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 255 }),
];

const stateBody = [
  body('activo')
    .not()
    .isEmpty()
    .withMessage('activo es obligatorio.')
    .isBoolean()
    .withMessage('activo debe ser booleano.'),
];

const assignModulesBody = [
  body('modulos')
    .isArray({ min: 1 })
    .withMessage('modulos debe ser un arreglo con al menos un elemento.'),
  body('modulos.*')
    .isInt({ min: 1 })
    .withMessage('Cada módulo debe ser un ID numérico válido.'),
];

router.use(auth);
router.use(authorize('admin'));

router.post('/', createValidation, validate, roleController.createRole);
router.put('/:id', [idParam, ...updateValidation], validate, roleController.updateRole);
router.get('/', paginationQuery, validate, roleController.listRoles);
router.patch('/:id/estado', [idParam, ...stateBody], validate, roleController.changeRoleState);
router.get('/:id', idParam, validate, roleController.getRoleDetail);

router.post(
  '/:id/modulos',
  [idParam, ...assignModulesBody],
  validate,
  roleController.assignModules,
);
router.get('/:id/modulos', [idParam, ...paginationQuery], validate, roleController.listModules);
router.delete('/:id/modulos/:moduleId', [idParam, moduleIdParam], validate, roleController.removeModule);

export default router;

