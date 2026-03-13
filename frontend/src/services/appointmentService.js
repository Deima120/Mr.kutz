/**
 * Appointment API
 */

import api from './api';

const APPOINTMENTS_BASE = '/appointments';

export const getAppointments = async (params = {}) => {
  const response = await api.get(APPOINTMENTS_BASE, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/${id}`);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const getAvailableSlots = async (barberId, date) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/slots`, {
    params: { barberId, date },
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
