/**
 * Estado visual del badge de caja (puro, testeable sin JSX).
 */

export function resolveCashRegisterStatusBadge(register = {}) {
  if (register.isStaleOpen) {
    return {
      kind: 'stale',
      label: 'Sin cerrar',
      className: 'border-red-200 bg-red-50 text-red-800',
    };
  }
  if (register.status === 'OPEN') {
    return {
      kind: 'open',
      label: 'Abierta',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }
  if (register.status === 'CLOSED') {
    return {
      kind: 'closed',
      label: 'Cerrada',
      className: 'border-stone-200 bg-stone-100 text-stone-700',
    };
  }
  return {
    kind: 'unknown',
    label: register.status || '—',
    className: 'border-stone-200 bg-stone-50 text-stone-600',
  };
}
