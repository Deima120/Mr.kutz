/**
 * Cash Register API (admin).
 */

import api from '@/shared/services/api';

const BASE = '/cash-registers';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

/** @returns {Promise<{ register: object|null, canCharge: boolean, todayYmd: string, summary: object|null }>} */
export const getCurrent = async () => {
  const response = await api.get(`${BASE}/current`);
  const data = extract(response);
  return {
    register: data?.register ?? null,
    canCharge: Boolean(data?.canCharge),
    todayYmd: data?.todayYmd || '',
    summary: data?.summary ?? null,
  };
};

/** @returns {Promise<object>} */
export const open = async (body = {}) => {
  const response = await api.post(`${BASE}/open`, body);
  return extract(response);
};

/** @returns {Promise<object>} summary + register cerrado */
export const close = async (body = {}) => {
  const response = await api.post(`${BASE}/close`, body);
  return extract(response);
};

/** @returns {Promise<object>} */
export const getSummary = async (id) => {
  const response = await api.get(`${BASE}/${id}/summary`);
  return extract(response);
};

export const getHistory = async (params = {}) => {
  const response = await api.get(`${BASE}/history`, { params });
  const envelope = response?.data ?? response;
  const payload = envelope?.data ?? envelope;
  const rows = Array.isArray(payload) ? payload : payload?.registers ?? [];
  return {
    registers: Array.isArray(rows) ? rows : [],
    total: envelope?.total ?? payload?.total ?? rows.length,
    limit: envelope?.limit ?? payload?.limit ?? params.limit,
    offset: envelope?.offset ?? payload?.offset ?? params.offset ?? 0,
    totals: envelope?.totals ?? null,
  };
};
