/**
 * Categorías de servicio.
 *
 * Va contra `/service-categories`, con prefijo propio y no colgando de
 * `/services`, porque ahí `GET /services/:id` ya convive con
 * `GET /services/categories` y solo funciona por el orden de declaración.
 */

import api from '@/shared/services/api';

const BASE = '/service-categories';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

/** Por defecto solo las activas. `{ active: 'false' }` trae también las inactivas. */
export const getCategories = async (params = {}) => extract(await api.get(BASE, { params }));

export const createCategory = async (data) => extract(await api.post(BASE, data));

export const updateCategory = async (id, data) => extract(await api.put(`${BASE}/${id}`, data));

/**
 * Borrar no borra los servicios: se quedan sin categoría. La respuesta trae
 * `service_count_affected` para poder decir cuántos.
 */
export const deleteCategory = async (id) => extract(await api.delete(`${BASE}/${id}`));
