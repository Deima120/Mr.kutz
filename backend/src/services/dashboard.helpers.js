/**
 * Cálculos puros del panel del administrador.
 *
 * Viven fuera de `dashboard.service.js` para poder probarlos sin Prisma: aquí
 * solo entran datos ya consultados y salen los números que pinta el panel.
 */

import { APP_TIMEZONE, addDaysToYmd } from '../utils/colombiaTime.js';

/**
 * Estados de gasto que cuentan como plata comprometida con el proveedor.
 * Un borrador todavía no es un gasto, y los cancelados/anulados ya no lo son.
 */
export const COMMITTED_PURCHASE_STATUSES = ['ordered', 'partially_received', 'received'];

export function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/** Porcentaje entero de `part` sobre `total`; 0 cuando no hay total. */
export function ratio(part, total) {
  const t = Number(total || 0);
  if (t <= 0) return 0;
  return Math.round((Number(part || 0) / t) * 100);
}

/** Etiqueta corta ("lun 8") para el eje del gráfico de ingresos por día. */
export function dayLabel(ymd) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('es-CO', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
  });
}

/**
 * Días del rango, de `from` a `to` inclusive. Se topa en `maxDays` para que un
 * rango absurdo ("todo el año") no genere un array gigante ni un gráfico
 * ilegible de cientos de barras.
 */
export function daysOfRange(from, to, maxDays = 92) {
  const days = [];
  let cursor = from;
  while (cursor <= to && days.length < maxDays) {
    days.push(cursor);
    cursor = addDaysToYmd(cursor, 1);
  }
  return days;
}

/**
 * Composición del ingreso a partir del groupBy por tipo de línea.
 * Las líneas "manual" se suman al total pero no se muestran como categoría
 * propia: son cobros sueltos sin servicio ni producto detrás.
 */
export function buildRevenueMix(rows) {
  const mix = { service: 0, product: 0, manual: 0 };
  (rows || []).forEach((row) => {
    const key = String(row?.lineType);
    if (key in mix) mix[key] = round2(row?._sum?.lineAmount ?? 0);
  });
  const total = round2(mix.service + mix.product + mix.manual);
  return {
    services: mix.service,
    products: mix.product,
    manual: mix.manual,
    total,
    servicesPct: ratio(mix.service, total),
    productsPct: ratio(mix.product, total),
  };
}

/**
 * Promedio, distribución 1-5 y ranking por barbero a partir de las citas
 * valoradas del periodo. Ignora valores fuera de 1..5 en vez de dejarlos
 * contaminar el promedio.
 */
export function summarizeRatings(rows) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byBarber = new Map();
  let sum = 0;

  (rows || []).forEach((row) => {
    const value = Number(row?.clientRating);
    if (!Number.isInteger(value) || value < 1 || value > 5) return;
    distribution[value] += 1;
    sum += value;

    const key = row.barberId;
    if (key == null) return;
    if (!byBarber.has(key)) {
      byBarber.set(key, {
        barberId: key,
        name:
          [row.barber?.firstName, row.barber?.lastName].filter(Boolean).join(' ').trim() ||
          'Barbero',
        sum: 0,
        count: 0,
      });
    }
    const entry = byBarber.get(key);
    entry.sum += value;
    entry.count += 1;
  });

  const count = Object.values(distribution).reduce((a, b) => a + b, 0);

  return {
    ratings: {
      average: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
      count,
      distribution,
    },
    barberRatings: [...byBarber.values()]
      .map((b) => ({
        barberId: b.barberId,
        name: b.name,
        average: Math.round((b.sum / b.count) * 100) / 100,
        count: b.count,
      }))
      // Mejor promedio primero; a igual promedio manda quien tenga más
      // valoraciones, para que un 5.0 con una sola reseña no desplace a un
      // 4.9 con treinta.
      .sort((a, b) => b.average - a.average || b.count - a.count)
      .slice(0, 5),
  };
}
