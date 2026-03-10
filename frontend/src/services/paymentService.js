/**
 * Payment API
 */

import api from './api';

const PAYMENTS_BASE = '/payments';

export const getPaymentMethods = async () => {
  const response = await api.get(`${PAYMENTS_BASE}/methods`);
  return response?.data ?? response;
};

export const getPayments = async (params = {}) => {
  const response = await api.get(PAYMENTS_BASE, { params });
  return response?.data ?? response;
};

export const getPaymentsTotal = async (params = {}) => {
  const response = await api.get(`${PAYMENTS_BASE}/total`, { params });
  return response?.data ?? response;
};

export const getPaymentById = async (id) => {
  const response = await api.get(`${PAYMENTS_BASE}/${id}`);
  return response?.data ?? response;
};

export const createPayment = async (data) => {
  const response = await api.post(PAYMENTS_BASE, data);
  return response?.data ?? response;
};

export const deletePayment = async (id) => {
  const response = await api.delete(`${PAYMENTS_BASE}/${id}`);
  return response;
};
