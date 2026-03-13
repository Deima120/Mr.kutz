/**
 * Product & Inventory API
 */

import api from './api';

const PRODUCTS_BASE = '/products';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getProducts = async (params = {}) => {
  const response = await api.get(PRODUCTS_BASE, { params });
  return extract(response);
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

export const deleteProduct = async (id) => {
  const response = await api.delete(`${PRODUCTS_BASE}/${id}`);
  return response;
};

export const getProductMovements = async (id, limit = 50) => {
  const response = await api.get(`${PRODUCTS_BASE}/${id}/movements`, { params: { limit } });
  return extract(response);
};
