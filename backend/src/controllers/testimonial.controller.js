/**
 * Testimonial Controller
 */

import * as testimonialService from '../services/testimonial.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const list = await testimonialService.getAll({ activeOnly });
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const t = await testimonialService.getById(req.params.id);
    if (!t) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    res.json({ success: true, data: t });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const t = await testimonialService.create(req.body);
    res.status(201).json({ success: true, message: 'Testimonio creado.', data: t });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const t = await testimonialService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Testimonio actualizado.', data: t });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await testimonialService.remove(req.params.id);
    res.json({ success: true, message: 'Testimonio eliminado.' });
  } catch (error) {
    next(error);
  }
};
