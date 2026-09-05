/**
 * Usuarios del personal (`/api/users`).
 *
 * Los clientes NO se gestionan por aquí: su alta, edición y activación siguen en
 * `/api/clients`. La restricción se aplica en el servicio, no solo ocultando
 * botones en la interfaz.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import { strongPassword } from '../utils/validation.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de usuario no válido.');

const emailField = body('email')
  .trim()
  .isEmail()
  .withMessage('Indica un correo válido.')
  .isLength({ max: 255 })
  .withMessage('El correo es demasiado largo.');

const roleIdField = body('roleId').isInt({ min: 1 }).withMessage('Indica un rol válido.');

router.use(auth);
// Entrar exige poder consultar usuarios; cualquier escritura exige gestionarlos.
router.use(requirePermission('users.view', 'users.manage'));

router.get(
  '/',
  [
    query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    query('roleId').optional({ checkFalsy: true }).isInt({ min: 1 }),
    query('active').optional({ checkFalsy: true }).isIn(['true', 'false']),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
    query('offset').optional({ checkFalsy: true }).isInt({ min: 0 }),
  ],
  validate,
  userController.getAll,
);

router.get('/:id', idParam, validate, userController.getById);

const manage = requirePermission('users.manage');

router.post(
  '/',
  manage,
  [emailField, ...strongPassword('password'), roleIdField],
  validate,
  userController.create,
);

router.patch('/:id/role', manage, [idParam, roleIdField], validate, userController.changeRole);

router.patch(
  '/:id/status',
  manage,
  [idParam, body('isActive').isBoolean().withMessage('Estado no válido.').toBoolean()],
  validate,
  userController.setActive,
);

router.patch(
  '/:id/password',
  manage,
  [idParam, ...strongPassword('password')],
  validate,
  userController.resetPassword,
);

router.delete('/:id', manage, idParam, validate, userController.remove);

export default router;
