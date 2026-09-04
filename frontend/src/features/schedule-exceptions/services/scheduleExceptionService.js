/**
 * Festivos y cierres del calendario de la barbería.
 *
 * Los festivos colombianos los calcula el backend, así que aquí no hay ninguna
 * lista que mantener: `getCalendar` ya devuelve el año resuelto, con el horario
 * con el que queda cada día una vez aplicados el festivo y la excepción.
 */

import api from '@/shared/services/api';

const BASE = '/schedule-exceptions';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

/** Año completo: festivos calculados fusionados con las excepciones cargadas. */
export const getCalendar = async (year) => {
  const response = await api.get(`${BASE}/calendar`, { params: { year } });
  return extract(response);
};

/**
 * Crea o reemplaza la excepción de una fecha. El backend hace `upsert` sobre la
 * fecha, así que marcar un día que ya estaba marcado no duplica nada.
 */
export const saveException = async ({ date, isClosed, startTime, endTime, reason }) => {
  const response = await api.post(BASE, {
    date,
    isClosed: Boolean(isClosed),
    // El backend interpreta ambas horas vacías como "día normal", que es cómo se
    // trabaja un festivo. Se manda undefined, no cadena vacía.
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    reason: reason?.trim() || undefined,
  });
  return extract(response);
};

/**
 * Quita la excepción. El día vuelve a regirse por el cálculo automático: si era
 * festivo, vuelve a horario de festivo; si no, a su horario normal.
 */
export const deleteException = async (id) => {
  const response = await api.delete(`${BASE}/${id}`);
  return extract(response);
};
