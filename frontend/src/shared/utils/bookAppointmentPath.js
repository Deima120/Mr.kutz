const PUBLIC_BOOKING_PATH = '/reservar';
const APPOINTMENT_FORM_PATH = '/appointments/new';

/** Ruta de agendar: formulario interno si admin/cliente; reserva pública si no hay sesión. */
export function getBookAppointmentPath(user) {
  if (!user) return PUBLIC_BOOKING_PATH;
  if (user.role === 'admin' || user.role === 'client') return APPOINTMENT_FORM_PATH;
  return PUBLIC_BOOKING_PATH;
}
