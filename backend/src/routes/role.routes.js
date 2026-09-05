/**
 * Roles y permisos (`/api/roles`).
 *
 * El catálogo de permisos es de solo lectura: se declara en
 * `src/config/permissions.js` y lo siembra el seed. Lo que se configura aquí es
 * qué permisos tiene cada rol.
 */

import express from 'express';
import { body, param } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as roleController from '../controllers/role.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de rol no válido.');

const nameField = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('El nombre del rol debe tener entre 2 y 50 caracteres.');

const descriptionField = body('description')
  .optional({ checkFalsy: true })
  .trim()
  .isLength({ max: 255 })
  .withMessage('La descripción es demasiado larga.');

const permissionsField = body('permissions')
  .optional()
  .isArray()
  .withMessage('Los permisos deben enviarse como lista.');

router.use(auth);
router.use(requirePermission('roles.view', 'roles.manage'));

router.get('/', roleController.getAll);
// Antes que `/:id` para que Express no interprete "permissions" como un id.
router.get('/permissions', roleController.getPermissions);
router.get('/:id', idParam, validate, roleController.getById);

const manage = requirePermission('roles.manage');

router.post('/', manage, [nameField, descriptionField, permissionsField], validate, roleController.create);

router.put(
  '/:id',
  manage,
  [
    idParam,
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    descriptionField,
    body('isActive').optional().isBoolean().toBoolean(),
    permissionsField,
  ],
  validate,
  roleController.update,
);

router.delete('/:id', manage, idParam, validate, roleController.remove);

export default router;
