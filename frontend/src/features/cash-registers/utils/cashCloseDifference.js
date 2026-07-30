/**
 * Diferencia efectivo contado vs esperado (cierre de caja).
 */

import { parseMoneyInput } from '../../../shared/utils/money.js';

/**
 * @param {unknown} expectedCash
 * @param {string|number|null|undefined} countedInput valor del input (formateado o vacío)
 * @returns {{
 *   kind: 'empty'|'match'|'over'|'short',
 *   difference: number|null,
 *   counted: number|null,
 *   label: string|null,
 *   toneClass: string,
 * }}
 */
export function resolveCashCloseDifference(expectedCash, countedInput) {
  const raw = countedInput == null ? '' : String(countedInput).trim();
  if (!raw) {
    return {
      kind: 'empty',
      difference: null,
      counted: null,
      label: null,
      toneClass: 'border-stone-200 bg-stone-50 text-stone-600',
    };
  }

  const counted = parseMoneyInput(raw);
  const expected = Number(expectedCash);
  if (!Number.isFinite(counted) || counted < 0 || !Number.isFinite(expected)) {
    return {
      kind: 'empty',
      difference: null,
      counted: Number.isFinite(counted) ? counted : null,
      label: null,
      toneClass: 'border-stone-200 bg-stone-50 text-stone-600',
    };
  }

  const difference = Math.round((counted - expected) * 100) / 100;
  if (difference === 0) {
    return {
      kind: 'match',
      difference: 0,
      counted,
      label: 'Cuadra',
      toneClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }
  if (difference > 0) {
    return {
      kind: 'over',
      difference,
      counted,
      label: 'Sobra',
      toneClass: 'border-amber-200 bg-amber-50 text-amber-950',
    };
  }
  return {
    kind: 'short',
    difference,
    counted,
    label: 'Falta',
    toneClass: 'border-red-200 bg-red-50 text-red-950',
  };
}
