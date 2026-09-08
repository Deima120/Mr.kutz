/**
 * Usuarios (`/users`): único lugar para cambiar el rol, ver el detalle y
 * restablecer la contraseña de cualquier cuenta, tenga o no ficha propia de
 * cliente o de barbero.
 */

import api from '@/shared/services/api';

const BASE = '/users';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getUsers = async (params = {}) => {
  // El interceptor de `api` ya resuelve la petición al body de la respuesta
  // (`{ success, data, total }`), no al objeto Axios completo: `response.data`
  // es directamente el array de usuarios, y `response.total` el total.
  const response = await api.get(BASE, { params });
  return {
    users: response?.data ?? [],
    total: response?.total ?? 0,
  };
};

export const getUserById = async (id) => extract(await api.get(`${BASE}/${id}`));

/** El administrador define una contraseña temporal; el usuario la cambia después. */
export const createUser = async ({ email, password, roleId }) =>
  extract(await api.post(BASE, { email, password, roleId }));

export const changeUserRole = async (id, roleId) =>
  extract(await api.patch(`${BASE}/${id}/role`, { roleId }));

/** Desactivar corta el acceso en la petición siguiente, sin esperar a que caduque el token. */
export const setUserActive = async (id, isActive) =>
  extract(await api.patch(`${BASE}/${id}/status`, { isActive }));

export const resetUserPassword = async (id, password) =>
  extract(await api.patch(`${BASE}/${id}/password`, { password }));

/**
 * Borrado definitivo. El backend responde 409 si el usuario ya tiene movimientos
 * registrados: en ese caso hay que desactivarlo, no borrarlo.
 */
export const deleteUser = async (id) => extract(await api.delete(`${BASE}/${id}`));
