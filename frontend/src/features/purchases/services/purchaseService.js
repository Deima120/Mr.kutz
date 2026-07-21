import api from '@/shared/services/api';

const BASE = '/purchases';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getPurchases = async (params = {}) => {
  const res = await api.get(BASE, { params });
  const payload = extract(res);
  const purchases = Array.isArray(payload)
    ? payload
    : payload?.purchases ?? payload?.rows ?? [];
  return {
    purchases,
    total: payload?.total ?? res?.total ?? purchases.length,
    limit: payload?.limit ?? res?.limit ?? params.limit,
    offset: payload?.offset ?? res?.offset ?? params.offset ?? 0,
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

export const submitPurchase = async (id) => {
  const response = await api.post(`${BASE}/${id}/submit`);
  return extract(response);
};

export const receivePurchase = async (id, data) => {
  const response = await api.post(`${BASE}/${id}/receipts`, data);
  return extract(response);
};

export const cancelPurchase = async (id, body = {}) => {
  const response = await api.post(`${BASE}/${id}/cancel`, body);
  return extract(response);
};
