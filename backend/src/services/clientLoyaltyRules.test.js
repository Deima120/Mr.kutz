import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOYALTY_MILESTONES, milestonesReachedAt, getMilestoneByKey } from './clientLoyaltyRules.js';

describe('milestonesReachedAt', () => {
  it('no cumple ningún hito en counts que no son múltiplo de 5 ni 10', () => {
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 11]) {
      assert.equal(milestonesReachedAt(n).length, 0, `falló con ${n}`);
    }
  });

  it('cumple solo el de "cada 5" en 5', () => {
    const reached = milestonesReachedAt(5);
    assert.equal(reached.length, 1);
    assert.equal(reached[0].key, 'every_5_mascarilla');
    assert.equal(reached[0].occurrence, 1);
  });

  it('cumple solo el de "cada 5" en 15 (3ª vez)', () => {
    const reached = milestonesReachedAt(15);
    assert.equal(reached.length, 1);
    assert.equal(reached[0].key, 'every_5_mascarilla');
    assert.equal(reached[0].occurrence, 3);
  });

  it('cumple AMBOS hitos a la vez en 10', () => {
    const reached = milestonesReachedAt(10);
    const keys = reached.map((r) => r.key).sort();
    assert.deepEqual(keys, ['every_10_cerveza_depilacion', 'every_5_mascarilla']);
    const cerveza = reached.find((r) => r.key === 'every_10_cerveza_depilacion');
    const mascarilla = reached.find((r) => r.key === 'every_5_mascarilla');
    assert.equal(cerveza.occurrence, 1);
    assert.equal(mascarilla.occurrence, 2);
  });

  it('cumple ambos otra vez en 20 (2ª ocurrencia del de 10)', () => {
    const reached = milestonesReachedAt(20);
    const cerveza = reached.find((r) => r.key === 'every_10_cerveza_depilacion');
    assert.equal(cerveza.occurrence, 2);
  });

  it('no cumple nada en 0 o counts inválidos', () => {
    assert.equal(milestonesReachedAt(0).length, 0);
    assert.equal(milestonesReachedAt(-5).length, 0);
    assert.equal(milestonesReachedAt(NaN).length, 0);
  });

  it('el hito de 10 trae dos líneas de regalo', () => {
    const reached = milestonesReachedAt(10);
    const cerveza = reached.find((r) => r.key === 'every_10_cerveza_depilacion');
    assert.equal(cerveza.rewardLines.length, 2);
  });
});

describe('getMilestoneByKey', () => {
  it('devuelve la regla por su key', () => {
    assert.equal(getMilestoneByKey('every_5_mascarilla').every, 5);
  });

  it('devuelve undefined para una key desconocida', () => {
    assert.equal(getMilestoneByKey('no_existe'), undefined);
  });
});

describe('LOYALTY_MILESTONES', () => {
  it('tiene keys únicas', () => {
    const keys = LOYALTY_MILESTONES.map((m) => m.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});
