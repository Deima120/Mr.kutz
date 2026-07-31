/**
 * FAB de estado de caja (admin, fuera de Pagos / Caja / Otros ingresos).
 * Reposo: círculo ~52px. Hover (desktop): expande texto + acción.
 * Tap/click: abre modal abrir o cerrar según estado.
 */

import { Lock, Plus, Wallet } from 'lucide-react';
import {
  CASH_REGISTER_FAB_POSITION_CLASS,
  resolveCashRegisterFabChrome,
} from '@/features/cash-registers/utils/cashRegisterFab';

export default function CashRegisterFab({
  register,
  canCharge,
  loading,
  onOpenClick,
  onCloseClick,
}) {
  const chrome = resolveCashRegisterFabChrome({ register, canCharge, loading });

  const handleActivate = () => {
    if (chrome.action === 'open') {
      onOpenClick?.();
      return;
    }
    if (chrome.action === 'close') {
      onCloseClick?.();
    }
  };

  const ActionIcon = chrome.action === 'open' ? Plus : Lock;

  return (
    <div className={`pointer-events-none ${CASH_REGISTER_FAB_POSITION_CLASS}`}>
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading || !chrome.action}
        aria-label={chrome.actionLabel}
        title={chrome.actionLabel}
        className={`group pointer-events-auto relative flex h-[52px] max-w-[52px] items-center overflow-hidden rounded-full border border-stone-200/90 bg-white text-stone-800 shadow-card transition-[max-width,padding,box-shadow] duration-200 ease-out hover:max-w-[18rem] hover:pr-2 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60 ${
          chrome.stale ? 'ring-2 ring-red-400/70' : ''
        }`}
      >
        <span className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
          <Wallet className="h-5 w-5 text-stone-700" aria-hidden />
          <span
            className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-white ${chrome.dotClass} ${
              chrome.stale ? 'animate-pulse' : ''
            }`}
            aria-hidden
          />
        </span>

        <span className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="truncate text-xs font-semibold text-stone-800">{chrome.fabLabel}</span>
          {chrome.action ? (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                chrome.stale
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : chrome.action === 'open'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
              aria-hidden
            >
              <ActionIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
