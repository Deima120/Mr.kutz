/**
 * Cliente API para reservas públicas (sin autenticación).
 * Usa la misma base que el resto de la app (`VITE_API_URL`), pero con fetch
 * sin Authorization para no forzar sesión en el flujo de la landing.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const BASE = `${API_BASE}/appointments/public`;

function buildUrl(path, params) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute
    ? new URL(path)
    : new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request(path, { method = 'GET', params, body } = {}) {
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const json = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = new Error(json?.message || 'Error de red');
    err.status = res.status;
    err.data = json;
    throw err;
  }

  if (!json || typeof json !== 'object') {
    const err = new Error(
      'No se pudo cargar el catálogo de reservas. Revisa la URL de la API (VITE_API_URL).',
    );
    err.status = res.status;
    throw err;
  }

  return json;
}

export const getBarbers = async () => {
  const res = await request(`${BASE}/barbers`);
  return Array.isArray(res?.data) ? res.data : [];
};

export const getServices = async () => {
  const res = await request(`${BASE}/services`);
  return Array.isArray(res?.data) ? res.data : [];
};

export const getSlots = async ({ barberId, date, durationMinutes }) => {
  const res = await request(`${BASE}/slots`, {
    params: {
      barberId,
      date,
      ...(durationMinutes != null && durationMinutes > 0
        ? { durationMinutes }
        : {}),
    },
  });
  return Array.isArray(res?.data) ? res.data : [];
};

export const createBooking = async (payload) => {
  const res = await request(`${BASE}`, { method: 'POST', body: payload });
  return res?.data;
};
