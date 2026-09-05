/**
 * Categorías de servicio (`/api/service-categories`).
 *
 * Va bajo su propio prefijo y no colgando de `/services` a propósito: en
 * `service.routes.js` conviven `GET /services/:id` y `GET /services/categories`,
 * y eso solo funciona por el orden en que están declaradas. Colgar aquí un CRUD
 * entero sería frágil.
 */

import express from 'express';
import { body, param, query } from 'express-validator';
import { auth, requirePermission } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';
import * as categoryController from '../controllers/service-category.controller.js';

const router = express.Router();

const idParam = param('id').isInt({ min: 1 }).withMessage('ID de categoría no válido.');

const nameField = body('name')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('El nombre debe tener entre 1 y 100 caracteres.');

const descriptionField = body('description')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 255 })
  .withMessage('La descripción no puede superar los 255 caracteres.');

const activeField = body('isActive').optional().isBoolean().withMessage('Estado no válido.').toBoolean();

router.use(auth);
router.use(requirePermission('service_categories.manage'));

router.get(
  '/',
  [query('active').optional({ checkFalsy: true }).isIn(['true', 'false'])],
  validate,
  categoryController.getAll,
);

router.get('/:id', idParam, validate, categoryController.getById);

router.post('/', [nameField, descriptionField, activeField], validate, categoryController.create);

router.put(
  '/:id',
  [idParam, body('name').optional().trim().isLength({ min: 1, max: 100 }), descriptionField, activeField],
  validate,
  categoryController.update,
);

router.delete('/:id', idParam, validate, categoryController.remove);

export default router;
