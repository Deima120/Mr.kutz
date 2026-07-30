/**
 * Polling de caja (mismo ritmo que Citas: 30s).
 * Pausa cuando la pestaña está oculta; limpia interval + listener al stop.
 */

export const CASH_REGISTER_POLL_MS = 30_000;

/**
 * @param {object} options
 * @param {(opts?: { silent?: boolean }) => unknown} options.refresh
 * @param {number} [options.intervalMs]
 * @param {() => boolean} [options.getHidden]
 * @param {typeof setInterval} [options.setIntervalFn]
 * @param {typeof clearInterval} [options.clearIntervalFn]
 * @param {(type: string, listener: EventListener) => void} [options.addEventListener]
 * @param {(type: string, listener: EventListener) => void} [options.removeEventListener]
 * @returns {() => void} cleanup
 */
export function startCashRegisterPolling({
  refresh,
  intervalMs = CASH_REGISTER_POLL_MS,
  getHidden = () =>
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  addEventListener: addListener = (type, listener) =>
    document.addEventListener(type, listener),
  removeEventListener: removeListener = (type, listener) =>
    document.removeEventListener(type, listener),
} = {}) {
  if (typeof refresh !== 'function') {
    return () => {};
  }

  let timerId = null;

  const stopInterval = () => {
    if (timerId == null) return;
    clearIntervalFn(timerId);
    timerId = null;
  };

  const tick = () => {
    if (getHidden()) return;
    refresh({ silent: true });
  };

  const startInterval = () => {
    if (timerId != null) return;
    timerId = setIntervalFn(tick, intervalMs);
  };

  const onVisibility = () => {
    if (getHidden()) {
      stopInterval();
      return;
    }
    refresh({ silent: true });
    startInterval();
  };

  if (!getHidden()) {
    startInterval();
  }
  addListener('visibilitychange', onVisibility);

  return () => {
    stopInterval();
    removeListener('visibilitychange', onVisibility);
  };
}
