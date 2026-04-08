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
import testimonialRoutes from './testimonial.routes.js';
import paymentRoutes from './payment.routes.js';
import productRoutes from './product.routes.js';
import productCategoryRoutes from './product-category.routes.js';
import purchaseRoutes from './purchase.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import mobileRoutes from './mobile.routes.js';

const router = express.Router();

// Placeholder - API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Mr. Kutz v1.0',
    endpoints: {
      auth: '/api/auth',
      clients: '/api/clients',
      services: '/api/services',
      barbers: '/api/barbers',
      appointments: '/api/appointments',
      appointmentsPublicSatisfaction: '/api/appointments/public-satisfaction',
      testimonials: '/api/testimonials',
      payments: '/api/payments',
      products: '/api/products',
      productCategories: '/api/product-categories',
      purchases: '/api/purchases',
      dashboard: '/api/dashboard',
      settings: '/api/settings',
      mobile: '/api/mobile',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/services', serviceRoutes);
router.use('/barbers', barberRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/payments', paymentRoutes);
router.use('/products', productRoutes);
router.use('/product-categories', productCategoryRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/mobile', mobileRoutes);

export default router;
