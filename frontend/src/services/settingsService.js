/**
 * Settings API
 */

import api from './api';

const SETTINGS_BASE = '/settings';

export const getSettings = async () => {
  const response = await api.get(SETTINGS_BASE);
  const res = response?.data ?? response;
  return res?.data ?? res;
};

export const updateSettings = async (data) => {
  const response = await api.put(SETTINGS_BASE, data);
  const res = response?.data ?? response;
  return res?.data ?? res;
};
