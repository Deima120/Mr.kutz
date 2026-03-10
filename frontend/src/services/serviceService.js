/**
 * Service API - Catálogo de servicios
 */

import api from './api';

const SERVICES_BASE = '/services';

export const getServices = async (params = {}) => {
  const response = await api.get(SERVICES_BASE, { params });
  return response?.data ?? response;
};

export const getServiceById = async (id) => {
  const response = await api.get(`${SERVICES_BASE}/${id}`);
  return response?.data ?? response;
};

export const createService = async (data) => {
  const response = await api.post(SERVICES_BASE, data);
  return response?.data ?? response;
};

export const updateService = async (id, data) => {
  const response = await api.put(`${SERVICES_BASE}/${id}`, data);
  return response?.data ?? response;
};

export const deleteService = async (id) => {
  const response = await api.delete(`${SERVICES_BASE}/${id}`);
  return response;
};
