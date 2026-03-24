import * as categoryService from '../services/product-category.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const data = await categoryService.getAll({ activeOnly });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const item = await categoryService.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const item = await categoryService.create(req.body);
    res.status(201).json({ success: true, message: 'Categoría creada correctamente.', data: item });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const item = await categoryService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Categoría actualizada correctamente.', data: item });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await categoryService.remove(req.params.id);
    res.json({ success: true, message: 'Categoría eliminada correctamente.' });
  } catch (error) {
    next(error);
  }
};
