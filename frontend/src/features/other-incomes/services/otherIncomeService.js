import api from '@/shared/services/api';

const BASE = '/other-incomes';

export const getOtherIncomes = async (params = {}) => {
  const res = await api.get(BASE, { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    incomes: rows,
    total: res?.total ?? rows.length,
    totals: res?.totals ?? null,
    limit: res?.limit,
    offset: res?.offset ?? 0,
  };
};

export const createOtherIncome = async (body) => {
  const res = await api.post(BASE, body);
  return res?.data ?? res;
};

export const voidOtherIncome = async (id, body = {}) => {
  const res = await api.post(`${BASE}/${id}/void`, body);
  return res?.data ?? res;
};
