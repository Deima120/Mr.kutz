/**
 * Product & Inventory Controller
 */

import * as productService from '../services/product.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const lowStockOnly = req.query.lowStock === 'true';
    const search = req.query.search || '';
    const products = await productService.getAll({ activeOnly, lowStockOnly, search });
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (req, res, next) => {
  try {
    const products = await productService.getLowStock();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Producto creado correctamente.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Producto actualizado correctamente.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const { quantityChange, movementType, notes } = req.body;
    const product = await productService.updateStock(
      req.params.id,
      parseInt(quantityChange, 10),
      movementType,
      notes,
      req.user?.id
    );
    res.json({
      success: true,
      message: 'Stock actualizado correctamente.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const movements = await productService.getMovements(req.params.id, limit);
    res.json({ success: true, data: movements });
  } catch (error) {
    next(error);
  }
};
