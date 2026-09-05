/**
 * Roles y catálogo de permisos.
 *
 * El catálogo es de solo lectura: los permisos los declara el backend, porque uno
 * que ningún código consulte no haría nada. Lo que se configura aquí es qué
 * permisos tiene cada rol.
 */

import api from '@/shared/services/api';

const BASE = '/roles';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getRoles = async () => extract(await api.get(BASE));

export const getRoleById = async (id) => extract(await api.get(`${BASE}/${id}`));

/** Permisos agrupados por módulo, en el orden en que deben pintarse. */
export const getPermissionCatalog = async () => extract(await api.get(`${BASE}/permissions`));

export const createRole = async ({ name, description, permissions }) =>
  extract(await api.post(BASE, { name, description, permissions }));

export const updateRole = async (id, data) => extract(await api.put(`${BASE}/${id}`, data));

/** El backend responde 409 si el rol todavía tiene usuarios asignados. */
export const deleteRole = async (id) => extract(await api.delete(`${BASE}/${id}`));
