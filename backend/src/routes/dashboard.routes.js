/**
 * Rutas del Dashboard
 */

import express from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(auth);
router.use(authorize('admin', 'barber'));

router.get('/stats', dashboardController.getStats);

export default router;
