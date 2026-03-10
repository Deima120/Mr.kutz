/**
 * Dashboard Controller
 */

import * as dashboardService from '../services/dashboard.service.js';

export const getStats = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const stats = await dashboardService.getStats(dateFrom, dateTo);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
