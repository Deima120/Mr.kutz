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
import { userCan } from '../middlewares/auth.js';

/**
 * A qué perfil propio hay que acotar la consulta de quien no puede verlo todo.
 *
 * Se resuelve por la IDENTIDAD del usuario —tiene ficha de barbero, o de
 * cliente— y no por cómo se llame su rol, para que un rol personalizado no pueda
 * colarse por una rama que no le corresponde.
 *
 * Si alguien tuviera ambas fichas, manda la de barbero: es el alcance más
 * restrictivo respecto a la agenda del negocio.
 *
 * @returns {{barberId?: number, clientId?: number} | null} `null` si no tiene
 *   ninguna ficha propia, en cuyo caso no hay nada que se le pueda mostrar.
 */
function resolveOwnScope(reqUser) {
  if (reqUser?.barber_id) return { barberId: reqUser.barber_id };
  if (reqUser?.client_id) return { clientId: reqUser.client_id };
  return null;
}

export const getAll = async (req, res, next) => {
  try {
    let { date, dateFrom, dateTo, barberId, clientId, status, limit, offset } = req.query;

    // El alcance lo decide el PERMISO, no el nombre del rol.
    //
    // Antes esto era `if (rol === 'barber') … else if (rol === 'client') …`, y
    // cualquier otro rol caía al caso general y veía la agenda completa. Mientras
    // solo existían tres roles el único que caía ahí era admin, pero al poder
    // crearse roles nuevos desde el panel esa rama se convertía en una escalada de
    // privilegios silenciosa.
    if (!userCan(req.user, 'appointments.view.all')) {
      const alcance = resolveOwnScope(req.user);
      if (!alcance) {
        // Fallar cerrado: sin permiso para verlo todo y sin un perfil propio al
        // que acotar, no hay nada que se pueda listar sin filtrar.
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para consultar la agenda.',
        });
      }
      if (alcance.barberId) barberId = String(alcance.barberId);
      if (alcance.clientId) clientId = String(alcance.clientId);
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
    // Igual que en `getAll`: manda el permiso, y quien no lo tiene solo alcanza lo
    // suyo. Antes se comparaba el nombre del rol, así que un rol nuevo veía
    // cualquier cita por su id.
    if (!userCan(req.user, 'appointments.view.all')) {
      const alcance = resolveOwnScope(req.user);
      if (!alcance) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para consultar esta cita.',
        });
      }
      const ownerClientId = appointment.client_id ?? appointment.clientId;
      const ownerBarberId = appointment.barber_id ?? appointment.barberId;
      const esSuya = alcance.barberId
        ? Number(ownerBarberId) === Number(alcance.barberId)
        : Number(ownerClientId) === Number(alcance.clientId);

      if (!esSuya) {
        return res.status(403).json({ success: false, message: 'Solo puedes ver tus propias citas.' });
      }
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
    const body = { ...req.body };
    if (!body.serviceId && (!Array.isArray(body.serviceIds) || body.serviceIds.length === 0)) {
      return res.status(400).json({ success: false, message: 'Indica al menos un servicio.' });
    }

    // Agendar a nombre de otra persona es una acción de mostrador, y quien la hace
    // necesita ver la agenda completa. Quien no puede verla toda solo puede
    // agendar para sí mismo, así que la cita se fuerza a su propia ficha.
    //
    // Este era el criterio de antes expresado por rol (`admin` libre, `client`
    // forzado, `barber` bloqueado); ahora sale del permiso, de modo que un rol
    // nuevo no hereda por accidente la capacidad de agendar para terceros.
    const puedeAgendarParaOtros = userCan(req.user, 'appointments.view.all');

    if (!puedeAgendarParaOtros) {
      // Fallar cerrado: sin ficha de cliente propia, antes se dejaba pasar el
      // clientId que trajera el cuerpo de la petición, permitiendo crear la cita a
      // nombre de cualquier otro cliente.
      if (!req.user.client_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes agendar citas a tu propio nombre.',
        });
      }
      body.clientId = req.user.client_id;
    }

    // El tope de citas pendientes es un control antiabuso del canal self-service.
    // El personal agenda por teléfono y para walk-ins con contexto que el sistema
    // no tiene; bloquearlo solo llevaría a cancelar y recrear citas.
    // Ojo: esto NO se salta la comprobación de cliente inactivo, que es otra cosa.
    const appointment = await appointmentService.create(body, {
      enforceClientLimit: !puedeAgendarParaOtros,
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
    let { barberId, days } = req.query;
    // Quien no ve la agenda completa solo ve su propio resumen. Antes dependía de
    // que el rol se llamara 'barber'; ahora depende de tener ficha de barbero, que
    // es lo que de verdad determina de quién son las valoraciones.
    if (!userCan(req.user, 'appointments.view.all')) {
      if (req.user.barber_id == null) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para consultar el resumen de valoraciones.',
        });
      }
      barberId = String(req.user.barber_id);
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
    // Valorar es un acto del cliente que recibió el servicio, así que hace falta
    // el permiso y además tener ficha de cliente: el permiso por sí solo no
    // identifica a nadie.
    if (!userCan(req.user, 'appointments.rate') || !req.user.client_id) {
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

    // Quien puede ver la agenda completa edita sin restricciones de propiedad; es
    // el caso del personal de mostrador. El resto solo alcanza lo suyo, y con qué
    // reglas depende de si es el cliente de la cita o el barbero que la atiende.
    //
    // El `if/else` va sobre la IDENTIDAD, no sobre el nombre del rol, y sin ficha
    // propia se deniega: antes, un rol que no fuera 'client' ni 'barber' se saltaba
    // los dos bloques de restricciones y editaba cualquier cita sin ninguna
    // comprobación.
    const puedeEditarCualquiera = userCan(req.user, 'appointments.view.all');
    const alcancePropio = puedeEditarCualquiera ? null : resolveOwnScope(req.user);

    if (!puedeEditarCualquiera && !alcancePropio) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar esta cita.',
      });
    }

    if (alcancePropio?.clientId) {
      if (Number(existing.clientId) !== Number(alcancePropio.clientId)) {
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

    if (alcancePropio?.barberId) {
      // El barbero solo confirma, cancela o marca «no asistió» en citas suyas
      // (la propiedad la verifica `canBarberUpdate`). Confirmar es lo que habilita
      // la promoción automática a in_progress/completed: sin ese paso la cita se
      // queda en `scheduled` para siempre.
      const verdict = canBarberUpdate(existing, alcancePropio.barberId, body);
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
