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
import cashRegisterRoutes from './cashRegister.routes.js';
import expenseRoutes from './expense.routes.js';
import otherIncomeRoutes from './otherIncome.routes.js';
import commissionRoutes from './commission.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import productRoutes from './product.routes.js';
import productCategoryRoutes from './product-category.routes.js';
import purchaseRoutes from './purchase.routes.js';
import supplierRoutes from './supplier.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import mobileRoutes from './mobile.routes.js';
import cronRoutes from './cron.routes.js';

const router = express.Router();

// Info pública mínima (sin mapa de endpoints)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Mr. Kutz API',
    version: '1.0.0',
    status: 'OK',
  });
});

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/services', serviceRoutes);
router.use('/barbers', barberRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/payments', paymentRoutes);
router.use('/cash-registers', cashRegisterRoutes);
router.use('/expenses', expenseRoutes);
router.use('/other-incomes', otherIncomeRoutes);
router.use('/commissions', commissionRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/products', productRoutes);
router.use('/product-categories', productCategoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/mobile', mobileRoutes);
router.use('/cron', cronRoutes);

export default router;
