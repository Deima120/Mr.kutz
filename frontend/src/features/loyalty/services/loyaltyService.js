/**
 * Loyalty API — configuración de hitos y consulta del historial global.
 */

import api from '@/shared/services/api';

const LOYALTY_BASE = '/loyalty';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getMilestoneRules = async () => {
  const response = await api.get(`${LOYALTY_BASE}/milestones`);
  const data = extract(response);
  return Array.isArray(data) ? data : [];
};

export const createMilestoneRule = async (data) => {
  const response = await api.post(`${LOYALTY_BASE}/milestones`, data);
  return extract(response);
};

export const updateMilestoneRule = async (id, data) => {
  const response = await api.put(`${LOYALTY_BASE}/milestones/${id}`, data);
  return extract(response);
};

/**
 * Solo para hitos que nunca otorgaron nada: el backend responde 409 si ya
 * tienen recompensas y hay que desactivarlos en su lugar.
 */
export const deleteMilestoneRule = async (id) => {
  const response = await api.delete(`${LOYALTY_BASE}/milestones/${id}`);
  return extract(response);
};

/** Indicadores del programa para la cabecera (todas las cifras vienen del backend). */
export const getLoyaltyStats = async () => {
  const response = await api.get(`${LOYALTY_BASE}/stats`);
  const data = extract(response);
  return data && typeof data === 'object' ? data : null;
};

export const deactivateMilestoneRule = async (id) => {
  const response = await api.patch(`${LOYALTY_BASE}/milestones/${id}/deactivate`);
  return extract(response);
};

/** El staff elige, en nombre del cliente, el premio de una recompensa pendiente. */
export const chooseRewardOption = async (rewardId, optionId) => {
  const response = await api.patch(`${LOYALTY_BASE}/rewards/${rewardId}/choose`, { optionId });
  return extract(response);
};

export const getRewardsHistory = async ({ limit = 10, offset = 0, clientId, status } = {}) => {
  const response = await api.get(`${LOYALTY_BASE}/rewards`, {
    params: { limit, offset, clientId: clientId || undefined, status: status || undefined },
  });
  const data = extract(response);
  return {
    rewards: Array.isArray(data?.rewards) ? data.rewards : [],
    total: typeof data?.total === 'number' ? data.total : 0,
  };
};
