/**
 * Payment Controller
 */

import * as paymentService from '../services/payment.service.js';

export const getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await paymentService.getPaymentMethods();
    res.json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      appointmentId,
      status,
      paymentMethodId,
      type,
      search,
      limit,
      offset,
    } = req.query;
    const result = await paymentService.getAll({
      dateFrom,
      dateTo,
      appointmentId,
      status,
      paymentMethodId,
      type,
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result.payments,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    next(error);
  }
};

export const getTotal = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const total = await paymentService.getTotalByDateRange(dateFrom, dateTo);
    res.json({ success: true, data: total });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado.' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const payment = await paymentService.create({
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json({
      success: true,
      message: 'Pago registrado correctamente.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const voidPayment = async (req, res, next) => {
  try {
    const row = await paymentService.voidPayment(req.params.id, {
      voidReason: req.body?.voidReason,
      voidedBy: req.user?.id,
    });
    res.json({ success: true, message: 'Pago anulado correctamente.', data: row });
  } catch (error) {
    next(error);
  }
};

export const voidPaymentLine = async (req, res, next) => {
  try {
    const row = await paymentService.voidPaymentLine(req.params.id, req.params.lineId, {
      voidReason: req.body?.voidReason,
      voidedBy: req.user?.id,
    });
    res.json({ success: true, message: 'Línea anulada correctamente.', data: row });
  } catch (error) {
    next(error);
  }
};
