/**
 * Service Controller - Catálogo de servicios
 */

import * as serviceService from '../services/service.service.js';

export const listPublicCategories = async (req, res, next) => {
  try {
    const data = await serviceService.listPublicCategories();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

function parseActiveFilter(queryActive) {
  const value = String(queryActive ?? '').trim().toLowerCase();
  if (value === 'false' || value === 'all') return 'all';
  if (value === 'inactive') return 'inactive';
  return 'active';
}

export const getAll = async (req, res, next) => {
  try {
    const activeFilter = parseActiveFilter(req.query.active);
    const services = await serviceService.getAll({ activeFilter });
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const service = await serviceService.getById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const service = await serviceService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Servicio creado correctamente.',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const service = await serviceService.update(req.params.id, req.body);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Servicio actualizado correctamente.',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await serviceService.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
    }
    res.json({ success: true, message: 'Servicio eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};
