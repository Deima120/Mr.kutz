/**
 * Expense Controller — categorías y gastos (admin).
 */

import * as expenseService from '../services/expense.service.js';

export const listCategories = async (req, res, next) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false' && req.query.activeOnly !== '0';
    const data = await expenseService.listCategories({ activeOnly });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await expenseService.createCategory({
      name: req.body?.name,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });
    res.status(201).json({
      success: true,
      message: 'Categoría creada correctamente.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await expenseService.updateCategory(req.params.id, {
      name: req.body?.name,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
    });
    res.json({
      success: true,
      message: 'Categoría actualizada correctamente.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const listExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.listExpenses({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      categoryId: req.query.categoryId,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result.expenses,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      totals: result.totals,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense({
      categoryId: req.body?.categoryId,
      amount: req.body?.amount,
      expenseDate: req.body?.expenseDate,
      notes: req.body?.notes,
      attachmentUrl: req.body?.attachmentUrl,
      createdById: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Gasto registrado correctamente.',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const voidExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.voidExpense(req.params.id, {
      voidReason: req.body?.voidReason,
      voidedById: req.user?.id,
    });
    res.json({
      success: true,
      message: 'Gasto anulado correctamente.',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};
