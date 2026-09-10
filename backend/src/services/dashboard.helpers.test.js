import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMMITTED_PURCHASE_STATUSES,
  buildRevenueMix,
  daysOfRange,
  ratio,
  round2,
  summarizeRatings,
} from './dashboard.helpers.js';

test('ratio: porcentaje entero, y 0 cuando no hay total', () => {
  assert.equal(ratio(25, 100), 25);
  assert.equal(ratio(1, 3), 33);
  // Sin citas en el periodo no puede haber "0% de cumplimiento" por división
  // entre cero: debe devolver 0 en vez de NaN o Infinity.
  assert.equal(ratio(5, 0), 0);
  assert.equal(ratio(0, 0), 0);
});

test('round2: redondea a dos decimales y tolera nulos', () => {
  assert.equal(round2(1999.999), 2000);
  assert.equal(round2(12.345), 12.35);
  assert.equal(round2(null), 0);
  assert.equal(round2(undefined), 0);
});

test('daysOfRange: incluye ambos extremos', () => {
  assert.deepEqual(daysOfRange('2026-09-01', '2026-09-04'), [
    '2026-09-01',
    '2026-09-02',
    '2026-09-03',
    '2026-09-04',
  ]);
  assert.deepEqual(daysOfRange('2026-09-09', '2026-09-09'), ['2026-09-09']);
});

test('daysOfRange: cruza fin de mes y respeta el tope', () => {
  assert.deepEqual(daysOfRange('2026-01-30', '2026-02-02'), [
    '2026-01-30',
    '2026-01-31',
    '2026-02-01',
    '2026-02-02',
  ]);
  // Un rango de un año no puede devolver 365 barras.
  assert.equal(daysOfRange('2026-01-01', '2026-12-31').length, 92);
  assert.equal(daysOfRange('2026-01-01', '2026-01-10', 3).length, 3);
});

test('daysOfRange: rango invertido no genera días', () => {
  assert.deepEqual(daysOfRange('2026-09-10', '2026-09-01'), []);
});

test('buildRevenueMix: separa servicios de productos con sus porcentajes', () => {
  const mix = buildRevenueMix([
    { lineType: 'service', _sum: { lineAmount: 750 } },
    { lineType: 'product', _sum: { lineAmount: 250 } },
  ]);
  assert.equal(mix.services, 750);
  assert.equal(mix.products, 250);
  assert.equal(mix.total, 1000);
  assert.equal(mix.servicesPct, 75);
  assert.equal(mix.productsPct, 25);
});

test('buildRevenueMix: lo manual suma al total sin ser categoría propia', () => {
  const mix = buildRevenueMix([
    { lineType: 'service', _sum: { lineAmount: 100 } },
    { lineType: 'manual', _sum: { lineAmount: 100 } },
  ]);
  assert.equal(mix.total, 200);
  assert.equal(mix.manual, 100);
  assert.equal(mix.servicesPct, 50);
});

test('buildRevenueMix: sin ventas devuelve ceros, no NaN', () => {
  const mix = buildRevenueMix([]);
  assert.equal(mix.total, 0);
  assert.equal(mix.servicesPct, 0);
  assert.equal(mix.productsPct, 0);
});

test('summarizeRatings: promedio, distribución y ranking por barbero', () => {
  const { ratings, barberRatings } = summarizeRatings([
    { clientRating: 5, barberId: 1, barber: { firstName: 'Ana', lastName: 'Ruiz' } },
    { clientRating: 4, barberId: 1, barber: { firstName: 'Ana', lastName: 'Ruiz' } },
    { clientRating: 3, barberId: 2, barber: { firstName: 'Luis', lastName: 'Paz' } },
  ]);

  assert.equal(ratings.count, 3);
  assert.equal(ratings.average, 4);
  assert.deepEqual(ratings.distribution, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });

  assert.equal(barberRatings.length, 2);
  assert.equal(barberRatings[0].name, 'Ana Ruiz');
  assert.equal(barberRatings[0].average, 4.5);
  assert.equal(barberRatings[0].count, 2);
});

test('summarizeRatings: a igual promedio manda quien tiene más valoraciones', () => {
  const { barberRatings } = summarizeRatings([
    { clientRating: 5, barberId: 1, barber: { firstName: 'Solo', lastName: 'Una' } },
    { clientRating: 5, barberId: 2, barber: { firstName: 'Con', lastName: 'Varias' } },
    { clientRating: 5, barberId: 2, barber: { firstName: 'Con', lastName: 'Varias' } },
  ]);
  assert.equal(barberRatings[0].name, 'Con Varias');
});

test('summarizeRatings: descarta valores fuera de 1..5 y filas sin barbero', () => {
  const { ratings, barberRatings } = summarizeRatings([
    { clientRating: 9, barberId: 1, barber: { firstName: 'Ana', lastName: 'Ruiz' } },
    { clientRating: 0, barberId: 1, barber: { firstName: 'Ana', lastName: 'Ruiz' } },
    { clientRating: null, barberId: 1, barber: { firstName: 'Ana', lastName: 'Ruiz' } },
    { clientRating: 4, barberId: null, barber: null },
  ]);
  // La única válida es la de barbero nulo: cuenta para el promedio general,
  // pero no puede inventar una fila en el ranking.
  assert.equal(ratings.count, 1);
  assert.equal(ratings.average, 4);
  assert.equal(barberRatings.length, 0);
});

test('summarizeRatings: sin valoraciones el promedio es null, no 0', () => {
  const { ratings } = summarizeRatings([]);
  assert.equal(ratings.average, null);
  assert.equal(ratings.count, 0);
});

test('los borradores y cancelados no cuentan como gasto comprometido', () => {
  assert.deepEqual(COMMITTED_PURCHASE_STATUSES, ['ordered', 'partially_received', 'received']);
  assert.ok(!COMMITTED_PURCHASE_STATUSES.includes('draft'));
  assert.ok(!COMMITTED_PURCHASE_STATUSES.includes('cancelled'));
});
