import api from '@/shared/services/api';

const BASE = '/purchases';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getPurchases = async () => {
  const response = await api.get(BASE);
  return extract(response);
};

export const getPurchaseById = async (id) => {
  const response = await api.get(`${BASE}/${id}`);
  return extract(response);
};

export const createPurchase = async (data) => {
  const response = await api.post(BASE, data);
  return extract(response);
};

export const voidPurchase = async (id, body = {}) => {
  const response = await api.post(`${BASE}/${id}/void`, body);
  return extract(response);
};
