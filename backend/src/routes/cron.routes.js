/**
 * Endpoints internos para cron externo (Render Cron, GitHub Actions, etc.).
 * Protegidos con CRON_SECRET en cabecera Authorization: Bearer <secret>.
 */

import express from 'express';
import { runAppointmentStatusSync } from '../jobs/appointmentStatusJob.js';

const router = express.Router();

function assertCronSecret(req, res, next) {
  const expected = String(process.env.CRON_SECRET || '').trim();
  if (!expected) {
    return res.status(503).json({
      success: false,
      message: 'CRON_SECRET no configurado en el servidor.',
    });
  }
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token !== expected) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }
  next();
}

router.post('/appointment-status', assertCronSecret, async (req, res, next) => {
  try {
    const result = await runAppointmentStatusSync();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
