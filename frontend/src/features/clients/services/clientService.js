/**
 * Client Service - Llamadas API de gestión de clientes
 */

import api from '@/shared/services/api';

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

export const getClientHistory = async (id, { limit = 10, offset = 0 } = {}) => {
  const response = await api.get(`${CLIENTS_BASE}/${id}/history`, { params: { limit, offset } });
  const res = response?.data ?? response;
  const data = res?.data ?? res;
  return {
    appointments: Array.isArray(data?.appointments) ? data.appointments : [],
    total: typeof data?.total === 'number' ? data.total : 0,
    completedTotal: typeof data?.completedTotal === 'number' ? data.completedTotal : 0,
  };
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

/**
 * Activa o inactiva un cliente (solo admin).
 *
 * Ruta propia en vez de `updateClient`: el PUT exige reenviar nombre, apellido y
 * correo, y un cambio de estado no debería arrastrar el perfil completo.
 *
 * Efecto doble en el backend: bloquea el inicio de sesión (si el cliente tiene
 * cuenta) y le impide agendar, incluida la reserva pública sin login.
 */
export const setClientStatus = async (id, isActive) => {
  const response = await api.patch(`${CLIENTS_BASE}/${id}/status`, { isActive });
  const res = response?.data ?? response;
  return res?.data ?? res;
};
