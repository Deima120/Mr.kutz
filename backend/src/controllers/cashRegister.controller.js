/**
 * Cash Register Controller — apertura / cierre / resumen (admin).
 */

import * as cashRegisterService from '../services/cashRegister.service.js';

export const getCurrent = async (req, res, next) => {
  try {
    const data = await cashRegisterService.getCurrentCashRegister();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const open = async (req, res, next) => {
  try {
    const register = await cashRegisterService.openCashRegister({
      openingAmount: req.body?.openingAmount,
      notes: req.body?.notes,
      openedById: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Caja abierta correctamente.',
      data: register,
    });
  } catch (error) {
    next(error);
  }
};

export const close = async (req, res, next) => {
  try {
    const summary = await cashRegisterService.closeCashRegister({
      countedCash: req.body?.countedCash,
      notes: req.body?.notes,
      closedById: req.user?.id,
    });
    res.json({
      success: true,
      message: 'Caja cerrada correctamente.',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const summary = await cashRegisterService.getCashRegisterSummary(req.params.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const result = await cashRegisterService.listCashRegisterHistory({
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status,
    });
    res.json({
      success: true,
      data: result.registers,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      totals: result.totals,
    });
  } catch (error) {
    next(error);
  }
};
