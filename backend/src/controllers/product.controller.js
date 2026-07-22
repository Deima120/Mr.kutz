/**
 * Product & Inventory Controller
 */

import * as productService from '../services/product.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const lowStockOnly = req.query.lowStock === 'true';
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || undefined;
    const limit = req.query.limit;
    const offset = req.query.offset;
    const result = await productService.getAll({
      activeOnly,
      lowStockOnly,
      search,
      categoryId,
      limit,
      offset,
    });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

export const importProducts = async (req, res, next) => {
  try {
    const result = await productService.importProducts(req.body.rows);
    res.status(201).json({
      success: true,
      message: `Importación: ${result.created} creado(s), ${result.failed} con error.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const voidMovement = async (req, res, next) => {
  try {
    const result = await productService.voidMovement(req.params.movementId, {
      voidReason: req.body.voidReason,
      voidedBy: req.user?.id,
    });
    res.json({
      success: true,
      message: 'Movimiento anulado correctamente.',
      data: result,
    });
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

export const getDossier = async (req, res, next) => {
  try {
    const dossier = await productService.getDossier(req.params.id);
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.json({ success: true, data: dossier });
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
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const result = await productService.getMovements(req.params.id, { limit, offset });
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    next(error);
  }
};
