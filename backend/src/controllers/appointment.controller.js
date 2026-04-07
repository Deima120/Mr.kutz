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
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const role = req.user.role_name;
    if (role === 'client' && Number(appointment.clientId) !== Number(req.user.client_id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own appointments.' });
    }
    if (role === 'barber' && Number(appointment.barberId) !== Number(req.user.barber_id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own appointments.' });
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
      return res.status(400).json({ success: false, message: 'barberId and date required' });
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
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const getRatingSummary = async (req, res, next) => {
  try {
    const role = req.user.role_name;
    if (role !== 'admin' && role !== 'barber') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    let { barberId, days } = req.query;
    if (role === 'barber') {
      barberId = req.user.barber_id != null ? String(req.user.barber_id) : '';
      if (!barberId) {
        return res.status(403).json({ success: false, message: 'Barber profile not linked.' });
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

export const submitClientRating = async (req, res, next) => {
  try {
    if (req.user.role_name !== 'client' || !req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Only clients can submit a rating.' });
    }
    const appointment = await appointmentService.submitClientRating(req.params.id, req.user.client_id, {
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(200).json({
      success: true,
      message: 'Rating saved',
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
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      if (Number(existing.clientId) !== Number(req.user.client_id)) {
        return res.status(403).json({ success: false, message: 'You can only update your own appointments.' });
      }
      if (req.body.status && !['cancelled'].includes(req.body.status)) {
        return res.status(403).json({ success: false, message: 'Clients can only cancel appointments.' });
      }
    }
    const appointment = await appointmentService.update(req.params.id, req.body);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};
