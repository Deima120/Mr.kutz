/**
 * Helpers del FAB de caja (acción, chrome, posición).
 */

import {
  resolveCashRegisterBannerDotClass,
  resolveCashRegisterBannerState,
} from './cashRegisterBannerState.js';

/** Por encima del contenido; debajo de toasts (z-[190]) y modales. */
export const CASH_REGISTER_FAB_POSITION_CLASS = 'fixed bottom-20 right-5 z-40';

/**
 * Padding inferior del contenido admin cuando el FAB está visible,
 * para no tapar la última fila de listados/formularios densos.
 */
export const CASH_REGISTER_FAB_CONTENT_PAD_CLASS = 'pb-24';

/**
 * @param {{ showOpen?: boolean, showClose?: boolean }|null|undefined} state
 * @returns {'open'|'close'|null}
 */
export function resolveCashRegisterFabAction(state) {
  if (state?.showOpen) return 'open';
  if (state?.showClose) return 'close';
  return null;
}

/**
 * @param {object} opts mismos args que resolveCashRegisterBannerState
 */
export function resolveCashRegisterFabChrome(opts = {}) {
  const state = resolveCashRegisterBannerState(opts);
  const action = resolveCashRegisterFabAction(state);
  return {
    kind: state.kind,
    fabLabel: state.fabLabel,
    action,
    actionLabel:
      action === 'open' ? 'Abrir caja' : action === 'close' ? 'Cerrar caja' : state.fabLabel,
    dotClass: resolveCashRegisterBannerDotClass(state.kind),
    stale: state.kind === 'stale',
  };
}
