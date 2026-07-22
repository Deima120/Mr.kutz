/**
 * Reglas de pago reutilizables (boundary de negocio sin Prisma).
 */

export function normalizeOptionalAppointmentId(value) {
  if (value == null || value === '') return null;
  const id = parseInt(value, 10);
  if (!Number.isFinite(id) || id < 1) {
    const err = new Error('Indica una cita válida.');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

/** Motivo de anulación obligatorio (trim, máx. 500). */
export function assertVoidReason(voidReason) {
  const reason = String(voidReason ?? '').trim();
  if (!reason) {
    const err = new Error('El motivo de anulación es obligatorio.');
    err.statusCode = 400;
    throw err;
  }
  return reason.slice(0, 500);
}
