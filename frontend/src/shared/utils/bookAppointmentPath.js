const PUBLIC_BOOKING_PATH = '/reservar';
const APPOINTMENT_FORM_PATH = '/appointments/new';
/** Intención post-registro vía query param (no location.state). */
const REGISTER_THEN_BOOK_PATH = '/register?redirect=/appointments/new';

/**
 * Destino de CTAs de agendar.
 * - admin/client → /appointments/new
 * - sin sesión + { commercial: true } → /register?redirect=/appointments/new
 * - sin sesión (default) → /reservar
 */
export function getBookAppointmentPath(user, { commercial = false } = {}) {
  if (user?.role === 'admin' || user?.role === 'client') return APPOINTMENT_FORM_PATH;
  if (!user && commercial) return REGISTER_THEN_BOOK_PATH;
  return PUBLIC_BOOKING_PATH;
}
