/**
 * Dashboard API
 */

import api from '@/shared/services/api';

const DASHBOARD_BASE = '/dashboard';

export const getStats = async (params = {}) => {
  const response = await api.get(`${DASHBOARD_BASE}/stats`, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};

/** Reporte enriquecido para admins: actual + periodo anterior + reseñas. */
export const getReport = async (params = {}) => {
  const response = await api.get(`${DASHBOARD_BASE}/report`, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};
