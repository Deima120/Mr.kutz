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
    const { dateFrom, dateTo, appointmentId, limit, offset } = req.query;
    const payments = await paymentService.getAll({
      dateFrom,
      dateTo,
      appointmentId,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: payments });
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
