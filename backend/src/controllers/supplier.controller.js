import * as supplierService from '../services/supplier.service.js';

export const getAll = async (req, res, next) => {
  try {
    const result = await supplierService.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await supplierService.getById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado.' });
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await supplierService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, message: 'Proveedor creado.', data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await supplierService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Proveedor actualizado.', data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await supplierService.remove(req.params.id);
    res.json({ success: true, message: 'Proveedor desactivado.', data });
  } catch (error) {
    next(error);
  }
};
