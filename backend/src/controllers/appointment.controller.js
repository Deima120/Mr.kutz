/**
 * Appointment Controller
 */

import prisma from '../lib/prisma.js';
import * as appointmentService from '../services/appointment.service.js';
import { assertClientCanCancelByLeadTime } from '../services/appointmentCancelRules.js';
import {
  canBarberUpdate,
  stripBarberForbiddenFields,
} from '../services/appointmentBarberRules.js';

export const getAll = async (req, res, next) => {
  try {
    let { date, dateFrom, dateTo, barberId, clientId, status, limit, offset } = req.query;
    // Fallar cerrado: si el rol es barber/client pero falta el perfil vinculado,
    // antes esto dejaba pasar el barberId/clientId tal cual venía en la query (o
    // ninguno, listando TODO sin filtrar) en vez de negar el acceso.
    if (req.user.role_name === 'barber') {
      if (!req.user.barber_id) {
        return res.status(403).json({ success: false, message: 'Perfil de barbero no vinculado.' });
      }
      barberId = String(req.user.barber_id);
    }
    if (req.user.role_name === 'client') {
      if (!req.user.client_id) {
        return res.status(403).json({ success: false, message: 'Perfil de cliente no vinculado.' });
      }
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
    res.json({ success: true, data: appointments.appointments, total: appointments.total, limit: appointments.limit, offset: appointments.offset });
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
    const { barberId, date, excludeAppointmentId, durationMinutes } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ success: false, message: 'Se requieren barbero y fecha.' });
    }
    const slots = await appointmentService.getAvailableSlots(
      barberId,
      date,
      excludeAppointmentId,
      durationMinutes ? parseInt(durationMinutes, 10) : 30,
    );
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    if (req.user.role_name === 'barber') {
      return res.status(403).json({ success: false, message: 'Los barberos no pueden crear citas.' });
    }
    const body = { ...req.body };
    if (!body.serviceId && (!Array.isArray(body.serviceIds) || body.serviceIds.length === 0)) {
      return res.status(400).json({ success: false, message: 'Indica al menos un servicio.' });
    }
    if (req.user.role_name === 'client') {
      // Fallar cerrado: sin client_id vinculado, antes se dejaba pasar el
      // clientId que el propio cuerpo de la petición trajera, permitiendo crear
      // la cita a nombre de cualquier otro cliente.
      if (!req.user.client_id) {
        return res.status(403).json({ success: false, message: 'Perfil de cliente no vinculado.' });
      }
      body.clientId = req.user.client_id;
    }
    // El tope de citas pendientes es un control antiabuso del canal self-service.
    // El admin agenda por teléfono y para walk-ins con contexto que el sistema no
    // tiene; bloquearlo solo llevaría al personal a cancelar y recrear citas.
    // Ojo: esto NO se salta la comprobación de cliente inactivo, que es otra cosa.
    const isAdmin = req.user.role_name === 'admin';
    const appointment = await appointmentService.create(body, {
      enforceClientLimit: !isAdmin,
    });
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
    const apptId = parseInt(req.params.id, 10);
    const existing = await prisma.appointment.findUnique({
      where: { id: apptId },
      select: {
        id: true,
        clientId: true,
        barberId: true,
        status: true,
        appointmentDate: true,
        startTime: true,
      },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    if (req.user.role_name === 'client') {
      // Antes esta comprobación era `role_name === 'client' && req.user.client_id`:
      // si el rol era 'client' pero no había client_id vinculado, la condición
      // completa era falsa y TODO este bloque de restricciones se saltaba, dejando
      // pasar la petición sin ninguna verificación (como si no hubiera reglas).
      // Falla cerrado: sin perfil de cliente vinculado, no hay nada que autorizar.
      if (!req.user.client_id) {
        return res.status(403).json({ success: false, message: 'Perfil de cliente no vinculado.' });
      }
      if (Number(existing.clientId) !== Number(req.user.client_id)) {
        return res.status(403).json({ success: false, message: 'Solo puedes modificar tus propias citas.' });
      }
      const terminal = ['cancelled', 'no_show', 'completed'];
      if (terminal.includes(existing.status)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede editar una cita cancelada, completada o marcada como no asistió.',
        });
      }
      if (body.status && !['cancelled'].includes(body.status)) {
        return res.status(403).json({
          success: false,
          message: 'Como cliente solo puedes cancelar la cita o usar «Editar» para cambiar fecha, hora y servicios.',
        });
      }
      if (body.status === 'cancelled') {
        assertClientCanCancelByLeadTime(existing);
      }
      delete body.clientId;
      delete body.barberId;
      delete body.serviceId; // el cliente actualiza servicios con serviceIds
    }

    if (req.user.role_name === 'barber') {
      // El barbero solo confirma, cancela o marca «no asistió» en citas suyas
      // (la propiedad la verifica `canBarberUpdate`). Confirmar es lo que habilita
      // la promoción automática a in_progress/completed: sin ese paso la cita se
      // queda en `scheduled` para siempre.
      const verdict = canBarberUpdate(existing, req.user.barber_id, body);
      if (!verdict.ok) {
        return res.status(verdict.statusCode).json({
          success: false,
          message: verdict.message,
        });
      }
      body = stripBarberForbiddenFields(body);
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
