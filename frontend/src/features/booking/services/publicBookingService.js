/**
 * Cliente API para reservas públicas (sin autenticación).
 * No usa el axios principal porque no queremos headers de Authorization.
 */

const BASE = '/api/appointments/public';

async function request(path, { method = 'GET', params, body } = {}) {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.message || 'Error de red');
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export const getBarbers = async () => {
  const res = await request(`${BASE}/barbers`);
  return res?.data || [];
};

export const getServices = async () => {
  const res = await request(`${BASE}/services`);
  return res?.data || [];
};

export const getSlots = async ({ barberId, date }) => {
  const res = await request(`${BASE}/slots`, { params: { barberId, date } });
  return res?.data || [];
};

export const createBooking = async (payload) => {
  const res = await request(`${BASE}`, { method: 'POST', body: payload });
  return res?.data;
};
