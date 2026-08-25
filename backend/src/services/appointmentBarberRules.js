/**
 * Reglas de escritura sobre citas para el rol `barber`.
 *
 * Un barbero solo puede **confirmar** o **cancelar** citas propias. El resto de
 * transiciones (`in_progress`, `completed`) las gobierna la automatización de
 * `appointmentStatusAutomation.js`, nunca un usuario.
 *
 * Confirmar importa más de lo que parece: `computeAutomaticStatus` solo promueve
 * citas en estado `confirmed`, así que una cita que se queda en `scheduled` nunca
 * avanza sola. El barbero es quien cierra ese circuito.
 */

/** Estados que un barbero puede fijar manualmente. */
export const BARBER_ALLOWED_STATUSES = new Set(['confirmed', 'cancelled']);

/** Estados desde los que ya no se admite ningún cambio manual. */
const TERMINAL_STATUSES = ['cancelled', 'no_show', 'completed'];

export const BARBER_NOT_OWNER_MESSAGE = 'Solo puedes modificar tus propias citas.';

export const BARBER_TERMINAL_MESSAGE =
  'No se puede editar una cita cancelada, completada o marcada como no asistió.';

export const BARBER_STATUS_MESSAGE =
  'Como barbero solo puedes confirmar o cancelar la cita.';

export const BARBER_NO_PROFILE_MESSAGE = 'Perfil de barbero no vinculado.';

/**
 * Campos que un barbero nunca puede modificar: la reprogramación y el cambio de
 * servicios son competencia del cliente o del admin.
 */
export const BARBER_FORBIDDEN_FIELDS = [
  'clientId',
  'barberId',
  'serviceId',
  'serviceIds',
  'appointmentDate',
  'startTime',
];

/**
 * ¿Puede este barbero aplicar `body` sobre `existing`?
 *
 * Devuelve un resultado en vez de lanzar para que el controlador decida el formato
 * de la respuesta, igual que hace con las comprobaciones del rol cliente.
 *
 * @param {{ barberId?: unknown, status?: unknown } | null} existing Cita en BD.
 * @param {unknown} barberId `req.user.barber_id`, resuelto desde la BD por el middleware.
 * @param {{ status?: unknown }} [body] Cuerpo de la petición.
 * @returns {{ ok: true } | { ok: false, statusCode: number, message: string }}
 */
export function canBarberUpdate(existing, barberId, body = {}) {
  if (barberId == null) {
    return { ok: false, statusCode: 403, message: BARBER_NO_PROFILE_MESSAGE };
  }
  if (!existing) {
    return { ok: false, statusCode: 404, message: 'Cita no encontrada.' };
  }

  if (Number(existing.barberId) !== Number(barberId)) {
    return { ok: false, statusCode: 403, message: BARBER_NOT_OWNER_MESSAGE };
  }

  if (TERMINAL_STATUSES.includes(existing.status)) {
    return { ok: false, statusCode: 400, message: BARBER_TERMINAL_MESSAGE };
  }

  // Sin `status` no hay nada que el barbero pueda cambiar: los demás campos le
  // están vetados, así que se rechaza en vez de aceptar una petición sin efecto.
  if (body.status == null || !BARBER_ALLOWED_STATUSES.has(body.status)) {
    return { ok: false, statusCode: 403, message: BARBER_STATUS_MESSAGE };
  }

  return { ok: true };
}

/**
 * Devuelve una copia de `body` sin los campos vetados al barbero.
 *
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
export function stripBarberForbiddenFields(body = {}) {
  const clean = { ...body };
  for (const field of BARBER_FORBIDDEN_FIELDS) {
    delete clean[field];
  }
  return clean;
}
