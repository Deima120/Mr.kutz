import api from '@/shared/services/api';

const BASE = '/expenses';

export const getCategories = async () => {
  const res = await api.get(`${BASE}/categories`);
  return res?.data ?? res;
};

export const getExpenses = async (params = {}) => {
  const res = await api.get(BASE, { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    expenses: rows,
    total: res?.total ?? rows.length,
    totals: res?.totals ?? null,
    limit: res?.limit,
    offset: res?.offset ?? 0,
  };
};

export const createExpense = async (body) => {
  const res = await api.post(BASE, body);
  return res?.data ?? res;
};

export const voidExpense = async (id, body = {}) => {
  const res = await api.post(`${BASE}/${id}/void`, body);
  return res?.data ?? res;
};
