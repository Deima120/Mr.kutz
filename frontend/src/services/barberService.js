/**
 * Barber API
 */

import api from './api';

const BARBERS_BASE = '/barbers';

export const getBarbers = async (params = {}) => {
  const response = await api.get(BARBERS_BASE, { params });
  return response?.data ?? response;
};

export const getBarberById = async (id) => {
  const response = await api.get(`${BARBERS_BASE}/${id}`);
  return response?.data ?? response;
};

export const getBarberSchedules = async (id) => {
  const response = await api.get(`${BARBERS_BASE}/${id}/schedules`);
  return response?.data ?? response;
};

export const createBarber = async (data) => {
  const response = await api.post(BARBERS_BASE, data);
  return response?.data ?? response;
};

export const updateBarber = async (id, data) => {
  const response = await api.put(`${BARBERS_BASE}/${id}`, data);
  return response?.data ?? response;
};

export const updateBarberSchedules = async (id, schedules) => {
  const response = await api.put(`${BARBERS_BASE}/${id}/schedules`, { schedules });
  return response?.data ?? response;
};
