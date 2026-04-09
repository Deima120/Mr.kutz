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
    const role = req.user.role_name;
    const ownerClientId = appointment.client_id ?? appointment.clientId;
    const ownerBarberId = appointment.barber_id ?? appointment.barberId;
    if (role === 'client' && Number(ownerClientId) !== Number(req.user.client_id)) {
      return res.status(403).json({ success: false, message: 'Solo puedes ver tus propias citas.' });
    }
    if (role === 'barber' && Number(ownerBarberId) !== Number(req.user.barber_id)) {
      return res.status(403).json({ success: false, message: 'Solo puedes ver tus propias citas.' });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { barberId, date, excludeAppointmentId } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ success: false, message: 'Se requieren barbero y fecha.' });
    }
    const slots = await appointmentService.getAvailableSlots(barberId, date, excludeAppointmentId);
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

export const getRatingSummary = async (req, res, next) => {
  try {
    const role = req.user.role_name;
    let { barberId, days } = req.query;
    if (role === 'barber') {
      barberId = req.user.barber_id != null ? String(req.user.barber_id) : '';
      if (!barberId) {
        return res.status(403).json({ success: false, message: 'Perfil de barbero no vinculado.' });
      }
    }
    const daysRaw = days;
    const daysNum =
      daysRaw === 'all' || daysRaw === undefined || daysRaw === '' || daysRaw == null
        ? null
        : parseInt(String(daysRaw), 10);
    const summary = await appointmentService.getRatingSummary({
      barberId: barberId ? parseInt(String(barberId), 10) : null,
      days: Number.isFinite(daysNum) && daysNum > 0 ? daysNum : null,
    });
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/** GET público para la landing: valoraciones agregadas y comentarios recientes (sin token). */
export const getPublicRatingSummary = async (req, res, next) => {
  try {
    const raw = req.query.limit;
    let recentLimit = 24;
    if (raw != null && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 48) recentLimit = n;
    }
    const summary = await appointmentService.getPublicRatingSummary({ recentLimit });
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const submitClientRating = async (req, res, next) => {
  try {
    if (req.user.role_name !== 'client' || !req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Solo los clientes pueden enviar una valoración.' });
    }
    const appointment = await appointmentService.submitClientRating(req.params.id, req.user.client_id, {
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(200).json({
      success: true,
      message: 'Valoración guardada.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    let body = { ...req.body };
    const existingForRole = await appointmentService.getById(req.params.id);
    if (!existingForRole) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    if (req.user.role_name === 'barber' && req.user.barber_id) {
      if (Number(existingForRole.barber_id) !== Number(req.user.barber_id)) {
        return res.status(403).json({ success: false, message: 'Solo puedes editar citas asignadas a ti.' });
      }
    }

    if (req.user.role_name === 'client' && req.user.client_id) {
      const ownerClientId = existingForRole.client_id ?? existingForRole.clientId;
      if (Number(ownerClientId) !== Number(req.user.client_id)) {
        return res.status(403).json({ success: false, message: 'Solo puedes modificar tus propias citas.' });
      }
      const terminal = ['cancelled', 'no_show', 'completed'];
      if (terminal.includes(existingForRole.status)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede editar una cita cancelada, completada o marcada como no asistió.',
        });
      }
      if (body.status && !['cancelled'].includes(body.status)) {
        return res.status(403).json({
          success: false,
          message: 'Como cliente solo puedes cancelar la cita o usar «Editar» para cambiar fecha y hora.',
        });
      }
      delete body.clientId;
      delete body.barberId;
      delete body.serviceId;
    }

    const appointment = await appointmentService.update(req.params.id, body);
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
