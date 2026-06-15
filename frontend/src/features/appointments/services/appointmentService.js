/**
 * Appointment API
 */

import api from '@/shared/services/api';

const APPOINTMENTS_BASE = '/appointments';

export const getAppointments = async (params = {}) => {
  const res = await api.get(APPOINTMENTS_BASE, { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    appointments: rows,
    total: typeof res?.total === 'number' ? res.total : rows.length,
    limit: res?.limit,
    offset: res?.offset ?? 0,
  };
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/${id}`);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const getAvailableSlots = async (barberId, date, excludeAppointmentId, durationMinutes) => {
  const params = { barberId, date };
  if (excludeAppointmentId != null && excludeAppointmentId !== '') {
    params.excludeAppointmentId = excludeAppointmentId;
  }
  if (durationMinutes != null && durationMinutes > 0) {
    params.durationMinutes = durationMinutes;
  }
  const response = await api.get(`${APPOINTMENTS_BASE}/slots`, {
    params,
  });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const createAppointment = async (data) => {
  const response = await api.post(APPOINTMENTS_BASE, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const updateAppointment = async (id, data) => {
  const response = await api.put(`${APPOINTMENTS_BASE}/${id}`, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/**
 * Resumen agregado de valoraciones (GET /api/appointments/rating-summary).
 * Solo admin y barbero. Params opcionales: `days` (número o `"all"`), `barberId` (solo admin).
 */
export const getAppointmentRatingSummary = async (params = {}) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/rating-summary`, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/**
 * Resumen público para la landing (sin sesión). GET /api/appointments/public-satisfaction
 * @param {{ limit?: number }} params — opcional, 1–48 comentarios recientes en la respuesta
 */
export const getPublicAppointmentSatisfaction = async (params = {}) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/public-satisfaction`, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/**
 * Valorar cita completada (POST /api/appointments/:id/rating). Solo rol client.
 * Body: `{ rating: 1-5, comment?: string }`
 */
export const submitAppointmentRating = async (id, { rating, comment }) => {
  const response = await api.post(`${APPOINTMENTS_BASE}/${id}/rating`, {
    rating,
    comment: comment?.trim() ? comment.trim() : undefined,
  });
  const res = response?.data ?? response;
  return res?.data ?? res;
};
