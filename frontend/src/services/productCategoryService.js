import api from './api';

const BASE = '/product-categories';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getCategories = async (params = {}) => {
  const response = await api.get(BASE, { params });
  return extract(response);
};

export const createCategory = async (data) => {
  const response = await api.post(BASE, data);
  return extract(response);
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`${BASE}/${id}`, data);
  return extract(response);
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`${BASE}/${id}`);
  return extract(response);
};
