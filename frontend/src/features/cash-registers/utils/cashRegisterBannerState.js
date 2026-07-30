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
    businessDate: register.businessDate,
  };
}
