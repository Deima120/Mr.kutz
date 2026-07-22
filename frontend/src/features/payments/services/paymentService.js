/**
 * Payment API
 */

import api from '@/shared/services/api';

const PAYMENTS_BASE = '/payments';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getPaymentMethods = async () => {
  const response = await api.get(`${PAYMENTS_BASE}/methods`);
  return extract(response);
};

export const getPayments = async (params = {}) => {
  const response = await api.get(PAYMENTS_BASE, { params });
  const envelope = response?.data ?? response;
  const payload = envelope?.data ?? envelope;
  const rows = Array.isArray(payload)
    ? payload
    : payload?.payments ?? payload?.rows ?? [];
  return {
    payments: Array.isArray(rows) ? rows : [],
    total: payload?.total ?? envelope?.total ?? response?.total ?? rows.length,
    limit: payload?.limit ?? envelope?.limit ?? params.limit,
    offset: payload?.offset ?? envelope?.offset ?? params.offset ?? 0,
  };
};

export const getPaymentById = async (id) => {
  const response = await api.get(`${PAYMENTS_BASE}/${id}`);
  return extract(response);
};

export const getPaymentsTotal = async (params = {}) => {
  const response = await api.get(`${PAYMENTS_BASE}/total`, { params });
  return extract(response);
};

export const createPayment = async (data) => {
  const response = await api.post(PAYMENTS_BASE, data);
  return extract(response);
};

/** Anula un pago completo. */
export const voidPayment = async (id, body = {}) => {
  const response = await api.post(`${PAYMENTS_BASE}/${id}/void`, body);
  return extract(response);
};

/** Anula una línea del cobro. */
export const voidPaymentLine = async (paymentId, lineId, body = {}) => {
  const response = await api.post(`${PAYMENTS_BASE}/${paymentId}/lines/${lineId}/void`, body);
  return extract(response);
};
