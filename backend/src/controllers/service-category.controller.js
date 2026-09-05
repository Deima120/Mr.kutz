/**
 * Categorías de servicio.
 */

import * as categoryService from '../services/service-category.service.js';

export const getAll = async (req, res, next) => {
  try {
    // `active=false` trae también las inactivas, igual que en categorías de
    // producto: la pantalla de gestión necesita verlas para poder reactivarlas.
    const activeOnly = String(req.query.active ?? '') !== 'false';
    res.json({ success: true, data: await categoryService.getAll({ activeOnly }) });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const category = await categoryService.getById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, message: 'Categoría creada correctamente.', data: category });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const category = await categoryService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Categoría actualizada correctamente.', data: category });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const resultado = await categoryService.remove(req.params.id);
    res.json({
      success: true,
      message: 'Categoría eliminada correctamente.',
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
};
