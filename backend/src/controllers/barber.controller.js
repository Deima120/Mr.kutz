/**
 * Barber Controller
 */

import * as barberService from '../services/barber.service.js';

function parseActiveFilter(queryActive) {
  const value = String(queryActive ?? '').trim().toLowerCase();
  if (value === 'false' || value === 'all') return 'all';
  if (value === 'inactive') return 'inactive';
  return 'active';
}

/**
 * Solo admin ve datos personales del personal (cédula, teléfono, correo) y su
 * porcentaje de comisión. Barberos y clientes consumen estos endpoints para
 * agendar, y les basta con los campos públicos.
 */
function canSeePrivateBarberData(req) {
  return req.user?.role_name === 'admin';
}

export const getAll = async (req, res, next) => {
  try {
    const activeFilter = parseActiveFilter(req.query.active);
    const includePrivate = canSeePrivateBarberData(req);
    const barbers = await barberService.getAll({
      activeFilter,
      document: req.query.document,
      includePrivate,
    });
    res.json({ success: true, data: barbers });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const barber = await barberService.getById(req.params.id, {
      includePrivate: canSeePrivateBarberData(req),
    });
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barbero no encontrado.' });
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
      message: 'Barbero creado correctamente.',
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
      return res.status(404).json({ success: false, message: 'Barbero no encontrado.' });
    }
    res.json({
      success: true,
      message: 'Barbero actualizado correctamente.',
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
      message: 'Horarios actualizados.',
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await barberService.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Barbero no encontrado.' });
    }
    res.json({ success: true, message: 'Barbero eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};
