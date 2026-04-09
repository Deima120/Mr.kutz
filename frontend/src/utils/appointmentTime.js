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

/**
 * YYYY-MM-DD de la cita tal como viene en la API (columna DATE / ISO).
 * Evita que medianoche UTC se muestre como el día anterior en zonas UTC−.
 */
export function extractAppointmentDateYmd(raw) {
  if (raw == null || raw === '') return '';
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str) {
    const head = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (head) return `${head[1]}-${head[2]}-${head[3]}`;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const head = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (head) return `${head[1]}-${head[2]}-${head[3]}`;
  return '';
}

/** Texto legible para listados (misma fecha civil que el input type="date"). */
export function formatAppointmentCalendarDate(
  raw,
  locale = 'es-ES',
  dateStyleOpts = {}
) {
  const ymd = extractAppointmentDateYmd(raw);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  const cal = new Date(y, m - 1, d);
  return cal.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...dateStyleOpts,
  });
}
