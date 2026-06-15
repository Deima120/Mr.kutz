/**
 * Product & Inventory API
 */

import api from '@/shared/services/api';

const PRODUCTS_BASE = '/products';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getProducts = async (params = {}) => {
  // El interceptor de api ya devuelve el cuerpo: { success, data, total, limit, offset, summary }
  const res = await api.get(PRODUCTS_BASE, { params });
  const data = Array.isArray(res?.data) ? res.data : [];
  return {
    data,
    total: typeof res?.total === 'number' ? res.total : data.length,
    limit: res?.limit ?? data.length,
    offset: res?.offset ?? 0,
    summary: res?.summary ?? null,
  };
};

export const getLowStock = async () => {
  const response = await api.get(`${PRODUCTS_BASE}/low-stock`);
  return extract(response);
};

export const getProductById = async (id) => {
  const response = await api.get(`${PRODUCTS_BASE}/${id}`);
  return extract(response);
};

export const createProduct = async (data) => {
  const response = await api.post(PRODUCTS_BASE, data);
  return extract(response);
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`${PRODUCTS_BASE}/${id}`, data);
  return extract(response);
};

export const updateStock = async (id, data) => {
  const response = await api.put(`${PRODUCTS_BASE}/${id}/stock`, data);
  return extract(response);
};

export const getProductMovements = async (id, limit = 50) => {
  const response = await api.get(`${PRODUCTS_BASE}/${id}/movements`, { params: { limit } });
  return extract(response);
};

export const getInventoryInsights = async () => {
  const response = await api.get(`${PRODUCTS_BASE}/insights`);
  return extract(response);
};

export const voidMovement = async (movementId, data = {}) => {
  const response = await api.post(`${PRODUCTS_BASE}/movements/${movementId}/void`, data);
  return extract(response);
};

export const importProducts = async (rows) => {
  const response = await api.post(`${PRODUCTS_BASE}/import`, { rows });
  const res = response?.data ?? response;
  return res?.data ?? res;
};
