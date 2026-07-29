/**
 * Variantes visuales del modal de confirmación (danger / warning / neutral).
 */

export const CONFIRM_VARIANTS = ['danger', 'warning', 'neutral'];

export function normalizeConfirmVariant(variant) {
  return CONFIRM_VARIANTS.includes(variant) ? variant : 'danger';
}

/**
 * @param {'danger' | 'warning' | 'neutral'} variant
 */
export function getConfirmVariantConfig(variant) {
  const key = normalizeConfirmVariant(variant);

  const configs = {
    danger: {
      variant: 'danger',
      iconWrapClass:
        'w-11 h-11 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3',
      confirmButtonClass:
        'flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-1.5',
      defaultConfirmLabel: 'Sí, confirmar',
      accentBarClass: 'from-red-500 via-rose-500 to-amber-500',
    },
    warning: {
      variant: 'warning',
      iconWrapClass:
        'w-11 h-11 bg-amber-50 border border-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3',
      confirmButtonClass:
        'flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5',
      defaultConfirmLabel: 'Sí, continuar',
      accentBarClass: 'from-amber-400 via-amber-500 to-orange-400',
    },
    neutral: {
      variant: 'neutral',
      iconWrapClass:
        'w-11 h-11 bg-stone-100 border border-stone-200 text-stone-700 rounded-full flex items-center justify-center mx-auto mb-3',
      confirmButtonClass:
        'flex-1 px-4 py-2.5 bg-barber-dark hover:bg-barber-charcoal disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5',
      defaultConfirmLabel: 'Confirmar',
      accentBarClass: 'from-gold-dark via-gold to-gold-light',
    },
  };

  return configs[key];
}
