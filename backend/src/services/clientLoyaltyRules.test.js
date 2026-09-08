import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { milestonesReachedAt, nextMilestone } from './clientLoyaltyRules.js';

const RULES = [
  { id: 1, everyCount: 5 },
  { id: 2, everyCount: 10 },
];

describe('milestonesReachedAt', () => {
  it('no cumple ninguna regla en counts que no son múltiplo de 5 ni 10', () => {
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 11]) {
      assert.equal(milestonesReachedAt(n, RULES).length, 0, `falló con ${n}`);
    }
  });

  it('cumple solo la de "cada 5" en 5', () => {
    const reached = milestonesReachedAt(5, RULES);
    assert.equal(reached.length, 1);
    assert.equal(reached[0].id, 1);
    assert.equal(reached[0].occurrence, 1);
  });

  it('cumple solo la de "cada 5" en 15 (3ª vez)', () => {
    const reached = milestonesReachedAt(15, RULES);
    assert.equal(reached.length, 1);
    assert.equal(reached[0].id, 1);
    assert.equal(reached[0].occurrence, 3);
  });

  it('cumple AMBAS reglas a la vez en 10', () => {
    const reached = milestonesReachedAt(10, RULES);
    const ids = reached.map((r) => r.id).sort();
    assert.deepEqual(ids, [1, 2]);
    const cada10 = reached.find((r) => r.id === 2);
    const cada5 = reached.find((r) => r.id === 1);
    assert.equal(cada10.occurrence, 1);
    assert.equal(cada5.occurrence, 2);
  });

  it('cumple ambas otra vez en 20 (2ª ocurrencia de la de 10)', () => {
    const reached = milestonesReachedAt(20, RULES);
    const cada10 = reached.find((r) => r.id === 2);
    assert.equal(cada10.occurrence, 2);
  });

  it('no cumple nada en 0, counts inválidos o sin reglas', () => {
    assert.equal(milestonesReachedAt(0, RULES).length, 0);
    assert.equal(milestonesReachedAt(-5, RULES).length, 0);
    assert.equal(milestonesReachedAt(NaN, RULES).length, 0);
    assert.equal(milestonesReachedAt(10, []).length, 0);
    assert.equal(milestonesReachedAt(10, null).length, 0);
  });

  it('ignora reglas con everyCount inválido', () => {
    const reached = milestonesReachedAt(10, [{ id: 3, everyCount: 0 }]);
    assert.equal(reached.length, 0);
  });
});

describe('nextMilestone', () => {
  it('devuelve la regla más cercana y cuánto falta', () => {
    const result = nextMilestone(3, RULES);
    assert.equal(result.rule.id, 1);
    assert.equal(result.remaining, 2);
  });

  it('al estar justo en un múltiplo, "remaining" es el ciclo completo siguiente', () => {
    const result = nextMilestone(5, RULES);
    assert.equal(result.rule.id, 1);
    assert.equal(result.remaining, 5);
  });

  it('con 0 completadas, faltan todas las de la regla más pequeña', () => {
    const result = nextMilestone(0, RULES);
    assert.equal(result.rule.id, 1);
    assert.equal(result.remaining, 5);
  });

  it('devuelve null sin reglas', () => {
    assert.equal(nextMilestone(3, []), null);
    assert.equal(nextMilestone(3, null), null);
  });
});
