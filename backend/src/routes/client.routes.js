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

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de cliente no válido.');

const listValidation = [
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  query('document').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  ...paginationQuery({ maxLimit: 100 }),
];

router.use(auth);
router.use(authorize('admin'));

router.get('/', listValidation, validate, clientController.getAll);
router.get('/:id/history', idParam, validate, clientController.getHistory);
router.get('/:id', idParam, validate, clientController.getById);
router.post('/', clientValidation, validate, clientController.create);
router.put('/:id', [idParam, ...clientValidation], validate, clientController.update);
router.delete('/:id', idParam, validate, clientController.remove);

export default router;
