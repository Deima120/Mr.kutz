import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clockTimeToDate, parseClockTime } from './appointment.time.helpers.js';

describe('parseClockTime', () => {
  it('rechaza ausencia, vacío y solo espacios', () => {
    for (const value of [undefined, null, '', '   ']) {
      assert.throws(() => parseClockTime(value), /obligatoria/);
    }
  });

  it('rechaza formatos inválidos y horas fuera de rango', () => {
    assert.throws(() => parseClockTime('abc'), /HH:MM/);
    assert.throws(() => parseClockTime('9'), /HH:MM/);
    assert.throws(() => parseClockTime('24:00'), /no es válida/);
    assert.throws(() => parseClockTime('12:60'), /no es válida/);
  });

  it('acepta HH:MM válidas sin inventar valores', () => {
    const parsed = parseClockTime('9:05');
    assert.equal(parsed.hours, 9);
    assert.equal(parsed.minutes, 5);
    assert.equal(parsed.totalMinutes, 9 * 60 + 5);
    assert.equal(parsed.normalized, '09:05');
    assert.equal(clockTimeToDate(parsed).toISOString(), '1970-01-01T09:05:00.000Z');
  });

  it('permite opcional solo cuando required=false', () => {
    assert.equal(parseClockTime('', { required: false }), null);
    assert.equal(parseClockTime(null, { required: false }), null);
  });
});
