import * as purchaseService from '../services/purchase.service.js';

export const getAll = async (req, res, next) => {
  try {
    const data = await purchaseService.getAll();
    res.json({ success: true, data });
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
    res.status(201).json({ success: true, message: 'Compra registrada correctamente.', data });
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
    res.json({ success: true, message: 'Compra anulada correctamente.', data });
  } catch (error) {
    next(error);
  }
};
