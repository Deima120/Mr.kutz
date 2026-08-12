/**
 * Auth Service - Llamadas API de autenticación
 */

import api from '@/shared/services/api';

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
 * Comprueba si un correo está disponible para registro
 * @param {string} email
 * @param {{ signal?: AbortSignal }} [options]
 */
export const checkEmailAvailability = async (email, options = {}) => {
  const response = await api.post(
    `${AUTH_BASE}/check-email`,
    { email },
    { signal: options.signal, timeout: 10_000 }
  );
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/**
 * Comprueba si un documento (tipo+número) está disponible para registro.
 * available: true si no existe; false si ya hay un cliente con ese documento.
 * @param {{ documentType: string, documentNumber: string }} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export const checkDocumentAvailability = async (payload, options = {}) => {
  const response = await api.post(
    `${AUTH_BASE}/check-document`,
    {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
    },
    { signal: options.signal, timeout: 10_000 }
  );
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

/**
 * Actualiza el perfil del cliente autenticado
 * @param {{ firstName: string, lastName: string, email: string, phone?: string }} data
 */
export const updateProfile = async (data) => {
  const response = await api.put(`${AUTH_BASE}/me`, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const forgotPassword = async (email) => {
  const response = await api.post(
    `${AUTH_BASE}/forgot-password`,
    { email },
    { timeout: 20_000 }
  );
  return response?.data ?? response;
};

export const verifyResetCode = async (email, code) => {
  const response = await api.post(
    `${AUTH_BASE}/verify-code`,
    { email, code },
    { timeout: 15_000 }
  );
  return response?.data ?? response;
};

export const resetPassword = async (email, code, newPassword) => {
  const response = await api.post(
    `${AUTH_BASE}/reset-password`,
    { email, code, newPassword },
    { timeout: 15_000 }
  );
  return response?.data ?? response;
};
