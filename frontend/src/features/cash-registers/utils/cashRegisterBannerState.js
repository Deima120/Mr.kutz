/**
 * Texto/variante del banner de caja (puro, testeable).
 */

export function resolveCashRegisterBannerState({ register, canCharge, loading } = {}) {
  if (loading) {
    return {
      kind: 'loading',
      variant: 'info',
      title: 'Caja',
      message: 'Consultando estado de caja…',
      showOpen: false,
      showClose: false,
      showLiveLink: false,
    };
  }

  if (!register || !canCharge) {
    return {
      kind: 'closed',
      variant: 'warning',
      title: 'Sin caja abierta',
      message: 'Abre la caja del día para registrar cobros.',
      showOpen: true,
      showClose: false,
      showLiveLink: false,
    };
  }

  if (register.isStaleOpen) {
    const days = Number(register.daysOpen) || 0;
    return {
      kind: 'stale',
      variant: 'error',
      title: 'Caja de un día anterior sin cerrar',
      message:
        register.staleWarning ||
        `Tienes una caja abierta del ${register.businessDate}, sin cerrar (${days} día${days === 1 ? '' : 's'}).`,
      showOpen: false,
      showClose: true,
      showLiveLink: true,
      businessDate: register.businessDate,
      daysOpen: days,
    };
  }

  return {
    kind: 'open',
    variant: 'success',
    title: 'Caja abierta',
    message: `Día ${register.businessDate}. Puedes registrar cobros.`,
    showOpen: false,
    showClose: true,
    showLiveLink: true,
    businessDate: register.businessDate,
  };
}

/** Clases de franja POS por estado (sin AppInlineAlert genérico). */
export function resolveCashRegisterBannerShellClass(kind) {
  switch (kind) {
    case 'open':
      return 'border-emerald-200/90 bg-emerald-50/90 text-emerald-950';
    case 'stale':
      return 'border-red-300 bg-red-50 text-red-950 ring-1 ring-red-300/70';
    case 'closed':
      return 'border-amber-200/90 bg-amber-50/90 text-amber-950';
    case 'loading':
    default:
      return 'border-stone-200 bg-stone-50 text-stone-700';
  }
}

export function resolveCashRegisterBannerDotClass(kind) {
  switch (kind) {
    case 'open':
      return 'bg-emerald-500';
    case 'stale':
      return 'bg-red-500';
    case 'closed':
      return 'bg-amber-500';
    default:
      return 'bg-stone-400';
  }
}
