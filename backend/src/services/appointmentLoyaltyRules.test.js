import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findRedundantLoyaltyService, rewardServiceIdsFromOption } from './appointmentLoyaltyRules.js';

describe('rewardServiceIdsFromOption', () => {
  it('extrae solo los ítems de tipo servicio con serviceId', () => {
    const ids = rewardServiceIdsFromOption([
      { itemType: 'service', serviceId: 36 },
      { itemType: 'product', productId: 7 },
      { itemType: 'service', serviceId: null },
    ]);
    assert.deepEqual([...ids], [36]);
  });

  it('devuelve un Set vacío sin items', () => {
    assert.equal(rewardServiceIdsFromOption(undefined).size, 0);
    assert.equal(rewardServiceIdsFromOption([]).size, 0);
  });
});

describe('findRedundantLoyaltyService', () => {
  const barba = { id: 36, name: 'Barba', comboComponents: [] };
  const corte = { id: 39, name: 'Corte', comboComponents: [] };
  const comboCorteBarba = { id: 41, name: 'Corte + Barba', comboComponents: [{ id: 39 }, { id: 36 }] };

  it('devuelve null si el premio no otorga ningún servicio', () => {
    assert.equal(findRedundantLoyaltyService([barba], new Set()), null);
  });

  it('devuelve null si ningún servicio de la cita coincide', () => {
    assert.equal(findRedundantLoyaltyService([corte], new Set([36])), null);
  });

  it('detecta el mismo servicio elegido directamente en la cita', () => {
    const found = findRedundantLoyaltyService([corte, barba], new Set([36]));
    assert.equal(found?.id, 36);
  });

  it('detecta el servicio escondido dentro de un combo real (comboComponents)', () => {
    const found = findRedundantLoyaltyService([comboCorteBarba], new Set([36]));
    assert.equal(found?.id, comboCorteBarba.id);
  });

  it('no bloquea un combo que NO incluye de verdad el servicio premiado', () => {
    const otroCombo = { id: 42, name: 'Corte + Cejas', comboComponents: [{ id: 39 }, { id: 50 }] };
    assert.equal(findRedundantLoyaltyService([otroCombo], new Set([36])), null);
  });
});
