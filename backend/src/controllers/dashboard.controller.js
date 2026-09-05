/**
 * Dashboard Controller
 */

import * as dashboardService from '../services/dashboard.service.js';
import { userCan } from '../middlewares/auth.js';

export const getStats = async (req, res, next) => {
  try {
    // El panel general trae ingresos totales del negocio, así que exige permiso
    // explícito. Antes bastaba con NO llamarse 'barber' para llegar a él, con lo
    // que cualquier rol nuevo lo habría visto entero.
    if (!userCan(req.user, 'dashboard.view.all')) {
      // Fallar cerrado: sin permiso general y sin ficha de barbero propia no hay
      // ningún panel que se pueda mostrar.
      if (!req.user?.barber_id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver el panel.',
        });
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
