/**
 * Appointment Controller
 */

import * as appointmentService from '../services/appointment.service.js';

export const getAll = async (req, res, next) => {
  try {
    const { date, barberId, clientId, status, limit, offset } = req.query;
    const appointments = await appointmentService.getAll({
      date,
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
    const appointment = await appointmentService.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
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
