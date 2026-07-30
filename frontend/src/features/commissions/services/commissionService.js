import api from '@/shared/services/api';

export const getCommissions = async (params = {}) => {
  const res = await api.get('/commissions', { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    entries: rows,
    total: res?.total ?? rows.length,
    totals: res?.totals ?? null,
    limit: res?.limit,
    offset: res?.offset ?? 0,
  };
};
