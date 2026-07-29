/**
 * Cola pura de toasts — sin React, fácil de testear.
 */

export const MAX_VISIBLE_TOASTS = 2;

export const TOAST_VARIANTS = ['success', 'error', 'warning', 'info'];

/** Duración por variante (ms). */
export function getToastDuration(variant) {
  switch (variant) {
    case 'error':
      return 7000;
    case 'warning':
      return 6000;
    case 'info':
      return 4000;
    case 'success':
    default:
      return 4000;
  }
}

export function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeToastVariant(variant) {
  return TOAST_VARIANTS.includes(variant) ? variant : 'success';
}

/**
 * Agrega un toast al final; si se supera el máximo, descarta los más antiguos.
 * @param {Array} queue
 * @param {{ id: string, message: string, variant?: string, duration?: number }} toast
 * @param {number} [max]
 */
export function pushToast(queue, toast, max = MAX_VISIBLE_TOASTS) {
  const list = Array.isArray(queue) ? queue : [];
  const next = [...list, toast];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}

export function dismissToast(queue, id) {
  const list = Array.isArray(queue) ? queue : [];
  return list.filter((t) => t?.id !== id);
}
