import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOMBIA_UTC_OFFSET,
  applyColombiaCreatedAtFilter,
  colombiaDayBounds,
  colombiaRangeBounds,
  formatInstantYmdInColombia,
  getColombiaTodayYmd,
} from './colombiaTime.js';

describe('colombiaDayBounds', () => {
  it('abre y cierra el día en offset Colombia', () => {
    const { start, end } = colombiaDayBounds('2026-07-28');
    assert.equal(start.toISOString(), new Date(`2026-07-28T00:00:00${COLOMBIA_UTC_OFFSET}`).toISOString());
    assert.equal(end.toISOString(), new Date(`2026-07-28T23:59:59.999${COLOMBIA_UTC_OFFSET}`).toISOString());
  });

  it('no usa Z (UTC) al final del día', () => {
    const { end } = colombiaDayBounds('2026-07-28');
    const wrongUtc = new Date('2026-07-28T23:59:59.999Z');
    assert.notEqual(end.getTime(), wrongUtc.getTime());
  });
});

describe('colombiaRangeBounds', () => {
  it('cubre varios días inclusivos', () => {
    const { start, end } = colombiaRangeBounds('2026-07-01', '2026-07-31');
    assert.equal(formatInstantYmdInColombia(start), '2026-07-01');
    assert.equal(formatInstantYmdInColombia(end), '2026-07-31');
  });
});

describe('applyColombiaCreatedAtFilter', () => {
  it('añade gte/lte Colombia', () => {
    const where = {};
    applyColombiaCreatedAtFilter(where, '2026-07-28', '2026-07-28');
    assert.ok(where.createdAt.gte instanceof Date);
    assert.ok(where.createdAt.lte instanceof Date);
    assert.equal(where.createdAt.gte.getTime(), colombiaDayBounds('2026-07-28').start.getTime());
  });
});

describe('getColombiaTodayYmd', () => {
  it('responde YYYY-MM-DD', () => {
    assert.match(getColombiaTodayYmd(new Date('2026-07-28T10:00:00-05:00')), /^\d{4}-\d{2}-\d{2}$/);
  });
});
