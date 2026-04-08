/**
 * Payment API
 */

import api from './api';

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
  return extract(response);
};

export const getPaymentsTotal = async (params = {}) => {
  const response = await api.get(`${PAYMENTS_BASE}/total`, { params });
  return extract(response);
};

export const getPaymentById = async (id) => {
  const response = await api.get(`${PAYMENTS_BASE}/${id}`);
  return extract(response);
};

export const createPayment = async (data) => {
  const response = await api.post(PAYMENTS_BASE, data);
  return extract(response);
};

/** Anula un pago (conserva registro; devuelve stock si era venta de producto). */
export const voidPayment = async (id, body = {}) => {
  const response = await api.post(`${PAYMENTS_BASE}/${id}/void`, body);
  return extract(response);
};
