/**
 * Product & Inventory API
 */

import api from './api';

const PRODUCTS_BASE = '/products';

export const getProducts = async (params = {}) => {
  const response = await api.get(PRODUCTS_BASE, { params });
  return response?.data ?? response;
};

export const getLowStock = async () => {
  const response = await api.get(`${PRODUCTS_BASE}/low-stock`);
  return response?.data ?? response;
};

export const getProductById = async (id) => {
  const response = await api.get(`${PRODUCTS_BASE}/${id}`);
  return response?.data ?? response;
};

export const createProduct = async (data) => {
  const response = await api.post(PRODUCTS_BASE, data);
  return response?.data ?? response;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`${PRODUCTS_BASE}/${id}`, data);
  return response?.data ?? response;
};

export const updateStock = async (id, data) => {
  const response = await api.put(`${PRODUCTS_BASE}/${id}/stock`, data);
  return response?.data ?? response;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`${PRODUCTS_BASE}/${id}`);
  return response;
};
