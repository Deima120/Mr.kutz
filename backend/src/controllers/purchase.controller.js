import * as purchaseService from '../services/purchase.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, status, search, limit, offset } = req.query;
    const result = await purchaseService.getAll({
      dateFrom,
      dateTo,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({
      success: true,
      data: result.purchases,
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
    const total = await purchaseService.getTotalByDateRange(dateFrom, dateTo);
    res.json({ success: true, data: total });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await purchaseService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Compra no encontrada.' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await purchaseService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Orden creada correctamente.', data });
  } catch (error) {
    next(error);
  }
};

export const submit = async (req, res, next) => {
  try {
    const data = await purchaseService.submit(req.params.id);
    res.json({ success: true, message: 'Orden enviada al proveedor.', data });
  } catch (error) {
    next(error);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const data = await purchaseService.cancel(req.params.id, {
      reason: req.body?.voidReason ?? req.body?.reason,
      userId: req.user?.id,
    });
    res.json({ success: true, message: 'Orden cancelada.', data });
  } catch (error) {
    next(error);
  }
};

export const receive = async (req, res, next) => {
  try {
    const data = await purchaseService.receive(req.params.id, req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Recepción registrada.', data });
  } catch (error) {
    next(error);
  }
};

export const voidPurchase = async (req, res, next) => {
  try {
    const data = await purchaseService.voidPurchase(req.params.id, {
      voidReason: req.body?.voidReason,
      voidedBy: req.user?.id,
    });
    res.json({ success: true, message: 'Orden cancelada correctamente.', data });
  } catch (error) {
    next(error);
  }
};
