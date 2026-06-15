import api from '@/shared/services/api';

const BASE = '/purchases';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getPurchases = async (params = {}) => {
  const res = await api.get(BASE, { params });
  const purchases = Array.isArray(res?.data) ? res.data : [];
  return {
    purchases,
    total: typeof res?.total === 'number' ? res.total : purchases.length,
    limit: res?.limit ?? params.limit,
    offset: res?.offset ?? params.offset ?? 0,
  };
};

export const getPurchasesTotal = async (params = {}) => {
  const response = await api.get(`${BASE}/total`, { params });
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
