import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_VISIBLE_TOASTS,
  createToastId,
  dismissToast,
  getToastDuration,
  normalizeToastVariant,
  pushToast,
} from './toastQueue.js';

describe('toastQueue', () => {
  it('normaliza variantes desconocidas a success', () => {
    assert.equal(normalizeToastVariant('error'), 'error');
    assert.equal(normalizeToastVariant('nope'), 'success');
  });

  it('asigna duraciones distintas por variante', () => {
    assert.equal(getToastDuration('success'), 4000);
    assert.equal(getToastDuration('info'), 4000);
    assert.equal(getToastDuration('warning'), 6000);
    assert.equal(getToastDuration('error'), 7000);
  });

  it('pushToast apila y descarta los más antiguos al superar el máximo', () => {
    const a = { id: 'a', message: 'Uno' };
    const b = { id: 'b', message: 'Dos' };
    const c = { id: 'c', message: 'Tres' };
    let q = pushToast([], a);
    q = pushToast(q, b);
    assert.equal(q.length, MAX_VISIBLE_TOASTS);
    q = pushToast(q, c);
    assert.deepEqual(
      q.map((t) => t.id),
      ['b', 'c']
    );
  });

  it('dismissToast quita solo el id indicado', () => {
    const q = [
      { id: 'a', message: 'A' },
      { id: 'b', message: 'B' },
    ];
    assert.deepEqual(dismissToast(q, 'a').map((t) => t.id), ['b']);
    assert.deepEqual(dismissToast(q, 'missing'), q);
  });

  it('createToastId genera ids distintos', () => {
    assert.notEqual(createToastId(), createToastId());
  });
});
