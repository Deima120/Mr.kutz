/**
 * Ausencias puntuales de barbero (vacaciones, incapacidad, permiso, festivo).
 * Independiente del horario semanal recurrente — ver barberService.js.
 */

import api from '@/shared/services/api';

const BASE = '/barber-schedule-exceptions';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

/** @param {{ barberId?: number|string, from?: string, to?: string, includeCancelled?: boolean }} params */
export const getScheduleExceptions = async (params = {}) => {
  const response = await api.get(BASE, { params });
  return extract(response);
};

/**
 * Registra una ausencia. Si hay citas agendadas en el rango y `confirmed` no
 * viene en true, el backend NO crea nada y devuelve `needsConfirmation: true`
 * con la lista de citas afectadas — hay que volver a llamar con
 * `{ ...data, confirmed: true }` para guardar igual.
 */
export const createScheduleException = async (data) => {
  const response = await api.post(BASE, data);
  return extract(response);
};

export const cancelScheduleException = async (id) => {
  const response = await api.post(`${BASE}/${id}/cancel`);
  return extract(response);
};

export const cancelScheduleExceptionBatch = async (batchId) => {
  const response = await api.post(`${BASE}/batch/${batchId}/cancel`);
  return extract(response);
};
