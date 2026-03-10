/**
 * Barber Controller
 */

import * as barberService from '../services/barber.service.js';

export const getAll = async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const barbers = await barberService.getAll({ activeOnly });
    res.json({ success: true, data: barbers });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const barber = await barberService.getById(req.params.id);
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }
    res.json({ success: true, data: barber });
  } catch (error) {
    next(error);
  }
};

export const getSchedules = async (req, res, next) => {
  try {
    const schedules = await barberService.getSchedules(req.params.id);
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const barber = await barberService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Barber created successfully',
      data: barber,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const barber = await barberService.update(req.params.id, req.body);
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }
    res.json({
      success: true,
      message: 'Barber updated successfully',
      data: barber,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSchedules = async (req, res, next) => {
  try {
    const schedules = await barberService.updateSchedules(
      req.params.id,
      req.body.schedules || []
    );
    res.json({
      success: true,
      message: 'Schedules updated',
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};
