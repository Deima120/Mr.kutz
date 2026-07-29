/**
 * Reglas de cancelación y transiciones que disparan correo.
 */

export const CANCEL_REASON_MAX = 500;

export function normalizeCancelReason(raw) {
  if (raw == null) return '';
  return String(raw).trim();
}

/**
 * @returns {{ ok: true, reason: string } | { ok: false, message: string }}
 */
export function validateCancelReason(raw) {
  const reason = normalizeCancelReason(raw);
  if (!reason) {
    return { ok: false, message: 'El motivo de cancelación es obligatorio.' };
  }
  if (reason.length > CANCEL_REASON_MAX) {
    return {
      ok: false,
      message: `El motivo de cancelación no puede superar ${CANCEL_REASON_MAX} caracteres.`,
    };
  }
  return { ok: true, reason };
}

/**
 * Qué notificación enviar tras un cambio de status (solo transición real).
 * @returns {'confirmed'|'cancelled'|'completed'|null}
 */
export function statusTransitionNotification(previousStatus, nextStatus) {
  if (!nextStatus || previousStatus === nextStatus) return null;
  if (nextStatus === 'confirmed') return 'confirmed';
  if (nextStatus === 'cancelled') return 'cancelled';
  if (nextStatus === 'completed') return 'completed';
  return null;
}
