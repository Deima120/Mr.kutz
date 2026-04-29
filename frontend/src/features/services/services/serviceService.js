/**
 * Service API - Catálogo de servicios
 */

import api from '@/shared/services/api';

const SERVICES_BASE = '/services';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getServices = async (params = {}) => {
  const response = await api.get(SERVICES_BASE, { params });
  return extract(response);
};

/** Categorías de servicios (público, sin token). */
export const getServiceCategories = async () => {
  const response = await api.get(`${SERVICES_BASE}/categories`);
  return extract(response);
};

export const getServiceById = async (id) => {
  const response = await api.get(`${SERVICES_BASE}/${id}`);
  return extract(response);
};

export const createService = async (data) => {
  const response = await api.post(SERVICES_BASE, data);
  return extract(response);
};

export const updateService = async (id, data) => {
  const response = await api.put(`${SERVICES_BASE}/${id}`, data);
  return extract(response);
};

export const deleteService = async (id) => {
  const response = await api.delete(`${SERVICES_BASE}/${id}`);
  return response;
};
