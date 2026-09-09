/**
 * Usuarios (`/api/users`): único lugar para cambiar el rol de cualquier
 * cuenta, ver su detalle y restablecer su contraseña — incluidos clientes y
 * barberos. La activación/borrado de la ficha de cliente y el borrado de
 * barbero siguen en `/api/clients`/`/api/barbers`; esa frontera se aplica en
 * el servicio, no solo ocultando botones en la interfaz.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import {
  strongPassword,
  optionalPersonNameField,
  optionalPhoneField,
  optionalDocumentTypeField,
  optionalDocumentNumberField,
} from '../utils/validation.js';
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

/**
 * Datos de ficha, solo obligatorios cuando el rol elegido es `barber` o
 * `client` — pero eso no se sabe hasta resolver el `roleId` contra la base,
 * así que aquí se validan como opcionales (formato, si vienen) y el service
 * exige los que falten según el rol real.
 */
const profileFields = [
  body('profile').optional().isObject().withMessage('El perfil debe ser un objeto.'),
  optionalPersonNameField('profile.firstName', 'El nombre'),
  optionalPersonNameField('profile.lastName', 'El apellido'),
  optionalPhoneField('profile.phone'),
  optionalDocumentTypeField('profile.documentType'),
  optionalDocumentNumberField('profile.documentNumber'),
  body('profile.specialties').optional({ checkFalsy: true }).isArray(),
  body('profile.specialties.*').optional().trim().isLength({ max: 80 }),
];

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
  [emailField, ...strongPassword('password'), roleIdField, ...profileFields],
  validate,
  userController.create,
);

router.patch(
  '/:id/role',
  manage,
  [idParam, roleIdField, ...profileFields],
  validate,
  userController.changeRole,
);

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
