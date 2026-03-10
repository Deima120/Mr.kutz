/**
 * Appointment API
 */

import api from './api';

const APPOINTMENTS_BASE = '/appointments';

export const getAppointments = async (params = {}) => {
  const response = await api.get(APPOINTMENTS_BASE, { params });
  return response?.data ?? response;
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/${id}`);
  return response?.data ?? response;
};

export const getAvailableSlots = async (barberId, date) => {
  const response = await api.get(`${APPOINTMENTS_BASE}/slots`, {
    params: { barberId, date },
  });
  return response?.data ?? response;
};

export const createAppointment = async (data) => {
  const response = await api.post(APPOINTMENTS_BASE, data);
  return response?.data ?? response;
};

export const updateAppointment = async (id, data) => {
  const response = await api.put(`${APPOINTMENTS_BASE}/${id}`, data);
  return response?.data ?? response;
};
