import { Wallet } from 'lucide-react';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import { formatPaymentAmount } from '@/features/payments/utils/paymentFormatters';
import { resolveCashRegisterBannerState } from '@/features/cash-registers/utils/cashRegisterBannerState';

export default function CashRegisterBanner({
  register,
  canCharge,
  loading,
  onOpenClick,
  onCloseClick,
}) {
  const state = resolveCashRegisterBannerState({ register, canCharge, loading });

  return (
    <AppInlineAlert
      variant={state.variant}
      role={state.kind === 'stale' ? 'alert' : 'status'}
      className={`mb-3 shrink-0 py-2.5 px-3 ${
        state.kind === 'stale' ? 'ring-1 ring-red-300/80 shadow-sm' : ''
      }`}
      title={
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          {state.title}
        </span>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm min-w-0">
          <p className={state.kind === 'stale' ? 'font-medium' : undefined}>{state.message}</p>
          {register && !loading ? (
            <p className="mt-0.5 text-xs opacity-90">
              Base {formatPaymentAmount(register.openingAmount)}
              {register.openedByEmail ? ` · ${register.openedByEmail}` : ''}
              {state.kind === 'stale' && state.daysOpen > 0
                ? ` · ${state.daysOpen} día${state.daysOpen === 1 ? '' : 's'} abierta`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {state.showOpen ? (
            <button
              type="button"
              onClick={onOpenClick}
              className="rounded-xl border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
            >
              Abrir caja
            </button>
          ) : null}
          {state.showClose ? (
            <button
              type="button"
              onClick={onCloseClick}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                state.kind === 'stale'
                  ? 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
                  : 'border border-emerald-300/80 bg-white text-emerald-950 hover:bg-emerald-50'
              }`}
            >
              Cerrar caja
            </button>
          ) : null}
        </div>
      </div>
    </AppInlineAlert>
  );
}
