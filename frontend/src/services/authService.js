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
  return response?.data ?? response;
};

/**
 * Inicia sesión
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
  const response = await api.post(`${AUTH_BASE}/login`, { email, password });
  return response?.data ?? response;
};

/**
 * Obtiene el perfil del usuario autenticado
 */
export const getProfile = async () => {
  const response = await api.get(`${AUTH_BASE}/me`);
  return response?.data ?? response;
};
