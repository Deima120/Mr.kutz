/**
 * Punto de entrada de rutas API
 * Agrupa todos los módulos de rutas bajo /api
 */

import express from 'express';

import authRoutes from './auth.routes.js';
import clientRoutes from './client.routes.js';
import serviceRoutes from './service.routes.js';
import barberRoutes from './barber.routes.js';
import appointmentRoutes from './appointment.routes.js';
import paymentRoutes from './payment.routes.js';
import productRoutes from './product.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = express.Router();

// Placeholder - API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MR. KUTZ API v1.0',
    endpoints: {
      auth: '/api/auth',
      clients: '/api/clients',
      services: '/api/services',
      barbers: '/api/barbers',
      appointments: '/api/appointments',
      payments: '/api/payments',
      products: '/api/products',
      dashboard: '/api/dashboard',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/services', serviceRoutes);
router.use('/barbers', barberRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/products', productRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
