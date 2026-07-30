/**
 * Commission Controller — listado admin.
 */

import * as commissionService from '../services/commission.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await commissionService.listCommissions({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      barberId: req.query.barberId,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result.entries,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      totals: result.totals,
    });
  } catch (error) {
    next(error);
  }
};
