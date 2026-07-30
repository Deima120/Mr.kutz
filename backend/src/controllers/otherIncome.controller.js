/**
 * Other Income Controller — ingresos fuera de ventas (admin).
 */

import * as otherIncomeService from '../services/otherIncome.service.js';

export const listOtherIncomes = async (req, res, next) => {
  try {
    const result = await otherIncomeService.listOtherIncomes({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      status: req.query.status,
      cashRegisterId: req.query.cashRegisterId,
      paymentMethodId: req.query.paymentMethodId,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result.otherIncomes,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    next(error);
  }
};

export const createOtherIncome = async (req, res, next) => {
  try {
    const row = await otherIncomeService.createOtherIncome({
      amount: req.body?.amount,
      description: req.body?.description,
      paymentMethodId: req.body?.paymentMethodId,
      incomeDate: req.body?.incomeDate,
      notes: req.body?.notes,
      createdById: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Ingreso registrado correctamente.',
      data: row,
    });
  } catch (error) {
    next(error);
  }
};

export const voidOtherIncome = async (req, res, next) => {
  try {
    const row = await otherIncomeService.voidOtherIncome(req.params.id, {
      voidReason: req.body?.voidReason,
      voidedById: req.user?.id,
    });
    res.json({
      success: true,
      message: 'Ingreso anulado correctamente.',
      data: row,
    });
  } catch (error) {
    next(error);
  }
};
