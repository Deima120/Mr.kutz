/**
 * Excepciones del calendario de la barbería (cierres y horarios especiales).
 */

import * as scheduleExceptionService from '../services/scheduleException.service.js';

/** GET /api/schedule-exceptions?from=&to= */
export const getAll = async (req, res, next) => {
  try {
    const data = await scheduleExceptionService.list({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/schedule-exceptions/calendar?year=
 * Festivos calculados fusionados con las excepciones cargadas.
 */
export const getCalendar = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const data = await scheduleExceptionService.getCalendar(year);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/** POST /api/schedule-exceptions — crea o reemplaza la excepción de esa fecha. */
export const upsert = async (req, res, next) => {
  try {
    const data = await scheduleExceptionService.upsert(req.body);
    res.status(201).json({
      success: true,
      message: 'Excepción guardada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/schedule-exceptions/:id */
export const remove = async (req, res, next) => {
  try {
    const eliminado = await scheduleExceptionService.remove(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ success: false, message: 'Excepción no encontrada.' });
    }
    res.json({ success: true, message: 'Excepción eliminada correctamente.' });
  } catch (error) {
    next(error);
  }
};
