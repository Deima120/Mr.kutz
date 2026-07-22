import api from '@/shared/services/api';

const BASE = '/suppliers';

const unwrap = (response) => {
  const payload = response?.data ?? response;
  return payload?.data ?? payload;
};

export async function getSuppliers(params = {}) {
  const response = await api.get(BASE, { params });
  const payload = unwrap(response);
  if (Array.isArray(payload)) return payload;
  return payload?.suppliers ?? payload?.rows ?? payload?.data ?? [];
}

export async function getSupplierById(id) {
  return unwrap(await api.get(`${BASE}/${id}`));
}

export async function createSupplier(data) {
  return unwrap(await api.post(BASE, data));
}

export async function updateSupplier(id, data) {
  return unwrap(await api.put(`${BASE}/${id}`, data));
}

export async function deleteSupplier(id) {
  return unwrap(await api.delete(`${BASE}/${id}`));
}
