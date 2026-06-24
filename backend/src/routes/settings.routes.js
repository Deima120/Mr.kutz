/**
 * Configuración pública del negocio (lectura para landing y correos).
 */

import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';

const router = express.Router();

router.get('/public', settingsController.getPublicSettings);

export default router;
