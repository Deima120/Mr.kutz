/**
 * Auth Service - Llamadas API de autenticación
 */

import api from './api';

const AUTH_BASE = '/auth';

/**
 * Registra un nuevo usuario
 * @param {Object} data - email, password, firstName, lastName, phone, role
 */
export const register = async (data) => {
  const response = await api.post(`${AUTH_BASE}/register`, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/**
 * Inicia sesión
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
  const response = await api.post(`${AUTH_BASE}/login`, { email, password });
  const data = response?.data ?? response;
  return data?.data ?? data;
};

/**
 * Obtiene el perfil del usuario autenticado
 */
export const getProfile = async () => {
  const response = await api.get(`${AUTH_BASE}/me`);
  const res = response?.data ?? response;
  return res?.data ?? res;
};
