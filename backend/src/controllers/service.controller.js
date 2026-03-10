/**
 * Service Controller - Catálogo de servicios
 */

import * as serviceService from '../services/service.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active === undefined || req.query.active !== 'false';
    const services = await serviceService.getAll({ activeOnly });
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const service = await serviceService.getById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
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
      message: 'Service created successfully',
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
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({
      success: true,
      message: 'Service updated successfully',
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
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
};
