/**
 * Client Service - Llamadas API de gestión de clientes
 */

import api from './api';

const CLIENTS_BASE = '/clients';

export const getClients = async (params = {}) => {
  const response = await api.get(CLIENTS_BASE, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const getClientById = async (id) => {
  const response = await api.get(`${CLIENTS_BASE}/${id}`);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const getClientHistory = async (id) => {
  const response = await api.get(`${CLIENTS_BASE}/${id}/history`);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const createClient = async (data) => {
  const response = await api.post(CLIENTS_BASE, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const updateClient = async (id, data) => {
  const response = await api.put(`${CLIENTS_BASE}/${id}`, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`${CLIENTS_BASE}/${id}`);
  return response;
};
