/**
 * Settings API
 */

import api from './api';

const SETTINGS_BASE = '/settings';

export const getSettings = async () => {
  const response = await api.get(SETTINGS_BASE);
  return response?.data ?? response;
};

export const updateSettings = async (data) => {
  const response = await api.put(SETTINGS_BASE, data);
  return response?.data ?? response;
};
