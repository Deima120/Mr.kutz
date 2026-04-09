/**
 * Hora de cita en la zona local del navegador, alineada con el selector de huecos (HH:MM).
 * Evita mostrar UTC u hora “cruda” del ISO distinta a la elegida por el usuario.
 */
export function formatAppointmentClockTime(t) {
  if (t == null || t === '') return '';
  if (t instanceof Date) {
    if (Number.isNaN(t.getTime())) return '';
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  }
  const s = String(t).trim();
  if (!s) return '';
  const bare = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?$/);
  if (bare) {
    return `${String(parseInt(bare[1], 10)).padStart(2, '0')}:${bare[2]}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const iso = s.match(/T(\d{1,2}):(\d{2})/);
  if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
  const any = s.match(/(\d{1,2}):(\d{2})/);
  if (any) return `${String(parseInt(any[1], 10)).padStart(2, '0')}:${any[2]}`;
  return '';
}
