import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CASH_REGISTER_POLL_MS,
  startCashRegisterPolling,
} from './cashRegisterPolling.js';

describe('startCashRegisterPolling', () => {
  it('usa intervalo de 30s por defecto', () => {
    assert.equal(CASH_REGISTER_POLL_MS, 30_000);
  });

  it('arranca interval y lo limpia al desmontar', () => {
    const calls = [];
    let hidden = false;
    let intervalCb = null;
    let cleared = false;
    const listeners = new Map();

    const stop = startCashRegisterPolling({
      refresh: (opts) => calls.push(['refresh', opts]),
      intervalMs: 1000,
      getHidden: () => hidden,
      setIntervalFn: (cb) => {
        intervalCb = cb;
        return 42;
      },
      clearIntervalFn: (id) => {
        assert.equal(id, 42);
        cleared = true;
        intervalCb = null;
      },
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type) => listeners.delete(type),
    });

    assert.equal(typeof intervalCb, 'function');
    assert.ok(listeners.has('visibilitychange'));

    intervalCb();
    assert.deepEqual(calls.at(-1), ['refresh', { silent: true }]);

    stop();
    assert.equal(cleared, true);
    assert.equal(listeners.has('visibilitychange'), false);
  });

  it('no hace tick si la pestaña está oculta; al volver refresca y reanuda', () => {
    const calls = [];
    let hidden = false;
    let intervalCb = null;
    let timerActive = false;
    const listeners = new Map();

    startCashRegisterPolling({
      refresh: (opts) => calls.push(opts),
      intervalMs: 1000,
      getHidden: () => hidden,
      setIntervalFn: (cb) => {
        intervalCb = cb;
        timerActive = true;
        return 7;
      },
      clearIntervalFn: () => {
        timerActive = false;
        intervalCb = null;
      },
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: (type) => listeners.delete(type),
    });

    hidden = true;
    listeners.get('visibilitychange')();
    assert.equal(timerActive, false);

    const before = calls.length;
    // no hay interval activo
    assert.equal(intervalCb, null);

    hidden = false;
    listeners.get('visibilitychange')();
    assert.equal(calls.length, before + 1);
    assert.deepEqual(calls.at(-1), { silent: true });
    assert.equal(timerActive, true);
  });

  it('sin refresh no arranca nada', () => {
    const stop = startCashRegisterPolling({});
    assert.equal(typeof stop, 'function');
    stop();
  });
});
