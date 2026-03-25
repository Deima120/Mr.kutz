/**
 * Dashboard Controller
 */

import * as dashboardService from '../services/dashboard.service.js';

export const getStats = async (req, res, next) => {
  try {
    if (req.user?.role_name === 'barber' && req.user?.barber_id) {
      const stats = await dashboardService.getBarberStats(req.user.barber_id);
      if (!stats) {
        return res.status(400).json({ success: false, message: 'No se pudo cargar el panel del barbero.' });
      }
      return res.json({ success: true, data: stats });
    }
    const { dateFrom, dateTo } = req.query;
    const stats = await dashboardService.getStats(dateFrom, dateTo);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
