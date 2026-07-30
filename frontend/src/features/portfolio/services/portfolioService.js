import api from '@/shared/services/api';

export const getPortfolio = async (params = {}) => {
  const res = await api.get('/portfolio', { params });
  const rows = Array.isArray(res?.data) ? res.data : [];
  return {
    appointments: rows,
    count: res?.count ?? rows.length,
    totalEstimated: res?.totalEstimated ?? 0,
  };
};
