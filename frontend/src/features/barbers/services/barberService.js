/**
 * Barber API
 */

import api from '@/shared/services/api';

const BARBERS_BASE = '/barbers';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getBarbers = async (params = {}) => {
  const response = await api.get(BARBERS_BASE, { params });
  return extract(response);
};

export const getBarberById = async (id) => {
  const response = await api.get(`${BARBERS_BASE}/${id}`);
  return extract(response);
};

export const getBarberSchedules = async (id) => {
  const response = await api.get(`${BARBERS_BASE}/${id}/schedules`);
  return extract(response);
};

export const createBarber = async (data) => {
  const response = await api.post(BARBERS_BASE, data);
  return extract(response);
};

export const updateBarber = async (id, data) => {
  const response = await api.put(`${BARBERS_BASE}/${id}`, data);
  return extract(response);
};

export const updateBarberSchedules = async (id, schedules) => {
  const response = await api.put(`${BARBERS_BASE}/${id}/schedules`, { schedules });
  return extract(response);
};

/** Activa o desactiva un barbero sin tocar el resto de su ficha. */
export const setBarberActive = async (id, isActive) => {
  const response = await api.put(`${BARBERS_BASE}/${id}`, { isActive });
  return extract(response);
};

/**
 * Borrado definitivo. El backend responde 409 si el barbero tiene citas o
 * comisiones: en ese caso hay que desactivarlo, no borrarlo.
 */
export const deleteBarber = async (id) => {
  const response = await api.delete(`${BARBERS_BASE}/${id}`);
  return extract(response);
};
