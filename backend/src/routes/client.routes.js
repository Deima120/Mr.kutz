/**
 * Rutas de clientes
 * Todas requieren autenticación (admin o barber)
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import {
  personNameField,
  optionalPhoneField,
  documentTypeField,
  documentNumberField,
  optionalDocumentTypeField,
  optionalDocumentNumberField,
  optionalNotesField,
  paginationQuery,
} from '../utils/validation.js';
import * as clientController from '../controllers/client.controller.js';

const router = express.Router();

const clientValidation = [
  personNameField('firstName', 'El nombre'),
  personNameField('lastName', 'El apellido'),
  optionalPhoneField('phone'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('Correo electrónico no válido.'),
  documentTypeField('documentType'),
  documentNumberField('documentNumber'),
  optionalNotesField('notes', 500),
];

/**
 * Actualización: igual que el alta salvo el documento, que es opcional.
 *
 * Los clientes creados desde la reserva pública nacen sin documento
 * (`publicBooking.service.js` solo guarda nombre, apellido, correo y teléfono),
 * así que exigirlo aquí impedía editarlos: no se podía ni corregir un teléfono
 * sin inventarles una cédula. Si no viene, `client.service.update` no toca el
 * campo; si viene la pareja incompleta, la sigue rechazando.
 */
const clientUpdateValidation = [
  personNameField('firstName', 'El nombre'),
  personNameField('lastName', 'El apellido'),
  optionalPhoneField('phone'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('Correo electrónico no válido.'),
  optionalDocumentTypeField('documentType'),
  optionalDocumentNumberField('documentNumber'),
  optionalNotesField('notes', 500),
];

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de cliente no válido.');

const listValidation = [
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  query('document').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  ...paginationQuery({ maxLimit: 100 }),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', listValidation, validate, clientController.getAll);
router.get(
  '/:id/history',
  [idParam, ...paginationQuery({ maxLimit: 100 })],
  validate,
  clientController.getHistory
);
router.get('/:id', idParam, validate, clientController.getById);
router.post('/', clientValidation, validate, clientController.create);
router.put('/:id', [idParam, ...clientUpdateValidation], validate, clientController.update);
/**
 * Ruta propia en vez de reutilizar el PUT: `clientUpdateValidation` exige nombre,
 * apellido y correo, y un simple cambio de estado no debería obligar a reenviar
 * el perfil completo. Queda cubierta por el `authorize('admin')` de arriba, así
 * que el barbero recibe 403 — activar o inactivar clientes es solo del admin.
 */
router.patch(
  '/:id/status',
  [idParam, body('isActive').isBoolean().withMessage('Estado no válido.').toBoolean()],
  validate,
  clientController.setStatus,
);
router.delete('/:id', idParam, validate, clientController.remove);

export default router;
