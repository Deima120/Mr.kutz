/**
 * Appointment Controller
 */

import * as appointmentService from '../services/appointment.service.js';

export const getAll = async (req, res, next) => {
  try {
    let { date, dateFrom, dateTo, barberId, clientId, status, limit, offset } = req.query;
    if (req.user.role_name === 'barber' && req.user.barber_id) {
      barberId = String(req.user.barber_id);
    }
    if (req.user.role_name === 'client' && req.user.client_id) {
      clientId = String(req.user.client_id);
    }
    const appointments = await appointmentService.getAll({
      date,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      barberId,
      clientId,
      status,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { barberId, date } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ success: false, message: 'Se requieren barbero y fecha.' });
    }
    const slots = await appointmentService.getAvailableSlots(barberId, date);
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (req.user.role_name === 'client' && req.user.client_id) {
      body.clientId = req.user.client_id;
    }
    const appointment = await appointmentService.create(body);
    res.status(201).json({
      success: true,
      message: 'Cita creada correctamente.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    if (req.user.role_name === 'client' && req.user.client_id) {
      const existing = await appointmentService.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
      }
      if (Number(existing.clientId) !== Number(req.user.client_id)) {
        return res.status(403).json({ success: false, message: 'Solo puedes modificar tus propias citas.' });
      }
      if (req.body.status && !['cancelled'].includes(req.body.status)) {
        return res.status(403).json({ success: false, message: 'Como cliente solo puedes cancelar citas.' });
      }
    }
    const appointment = await appointmentService.update(req.params.id, req.body);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }
    res.json({
      success: true,
      message: 'Cita actualizada correctamente.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};
