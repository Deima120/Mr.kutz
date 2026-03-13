/**
 * Dashboard API
 */

import api from './api';

const DASHBOARD_BASE = '/dashboard';

export const getStats = async (params = {}) => {
  const response = await api.get(`${DASHBOARD_BASE}/stats`, { params });
  const res = response?.data ?? response;
  return res?.data ?? res;
};
