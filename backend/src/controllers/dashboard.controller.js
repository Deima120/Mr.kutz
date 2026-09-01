/**
 * Dashboard Controller
 */

import * as dashboardService from '../services/dashboard.service.js';

export const getStats = async (req, res, next) => {
  try {
    if (req.user?.role_name === 'barber') {
      // Fallar cerrado: sin barber_id vinculado, antes esto caía al panel general
      // del negocio (ingresos totales, etc.), reservado a admin.
      if (!req.user?.barber_id) {
        return res.status(403).json({ success: false, message: 'Perfil de barbero no vinculado.' });
      }
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

export const getReport = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const report = await dashboardService.getReport(dateFrom, dateTo);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
