import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import { optionalDateQuery, paginationQuery } from '../utils/validation.js';

async function runValidators(validators, query) {
  const req = { query, body: {}, params: {}, cookies: {}, headers: {} };
  for (const rule of validators) {
    await rule.run(req);
  }
  return validationResult(req);
}

describe('query helpers P2', () => {
  it('acepta fechas ISO y rechaza basura', async () => {
    const rules = [optionalDateQuery('dateFrom', 'Fecha inicial')];
    const ok = await runValidators(rules, { dateFrom: '2026-07-01' });
    assert.equal(ok.isEmpty(), true);

    const bad = await runValidators(rules, { dateFrom: 'no-es-fecha' });
    assert.equal(bad.isEmpty(), false);
    assert.match(bad.array()[0].msg, /Fecha inicial/);
  });

  it('valida paginación con tope', async () => {
    const rules = paginationQuery({ maxLimit: 100 });
    const ok = await runValidators(rules, { limit: '20', offset: '0' });
    assert.equal(ok.isEmpty(), true);

    const over = await runValidators(rules, { limit: '500' });
    assert.equal(over.isEmpty(), false);

    const neg = await runValidators(rules, { offset: '-1' });
    assert.equal(neg.isEmpty(), false);
  });
});
