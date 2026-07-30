/**
 * Portfolio Controller — cartera (citas sin cobro).
 */

import * as portfolioService from '../services/portfolio.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await portfolioService.listUnpaidCompletedAppointments({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      barberId: req.query.barberId,
    });
    res.json({
      success: true,
      data: result.items,
      count: result.count,
      totalEstimated: result.totalEstimated,
    });
  } catch (error) {
    next(error);
  }
};
