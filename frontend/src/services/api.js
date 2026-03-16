/**
 * Cliente Axios configurado para comunicación con la API
 * Incluye interceptores para JWT y manejo de errores.
 * Nota: el mensaje "Failed to load resource: 500" en la consola del navegador
 * es normal cuando una petición falla; la UI muestra el mensaje amigable via err.message.
 */

import axios from 'axios';

// Proxy de Vite redirige /api al backend (ver vite.config.js)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: adjuntar token en cada request (login, barbers, services, appointments, etc.)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalizar error para que la UI siempre reciba { message } y opcionalmente { success: false }
function normalizeError(error) {
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 401) {
    localStorage.removeItem('token');
    try { localStorage.removeItem('user'); } catch (_) {}
    const path = window.location.pathname;
    if (!path.includes('/login') && !path.includes('/register')) {
      window.location.href = '/login';
    }
  }

  // El servidor respondió con JSON (ej. 400, 404, 500)
  if (data && typeof data === 'object') {
    return { ...data, message: data.message || 'Algo salió mal', status };
  }

  // Sin respuesta (red caída, CORS, servidor apagado)
  if (!error.response) {
    return {
      success: false,
      message: 'No se pudo conectar con el servidor. Revisa tu conexión o intenta más tarde.',
      status: 0,
    };
  }

  return {
    success: false,
    message: error.response?.status === 500
      ? 'Error en el servidor. Intenta de nuevo más tarde.'
      : 'Algo salió mal.',
    status: status,
  };
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(normalizeError(error))
);

export default api;
