import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { formatPaymentAmount } from '@/features/payments/utils/paymentFormatters';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import {
  resolveCashRegisterBannerDotClass,
  resolveCashRegisterBannerShellClass,
  resolveCashRegisterBannerState,
} from '@/features/cash-registers/utils/cashRegisterBannerState';

function formatYmd(ymd) {
  if (!ymd) return '—';
  return formatDisplayDate(`${ymd}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Metric({ label, value, emphasize = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p
        className={`tabular-nums leading-tight ${
          emphasize ? 'text-sm sm:text-base font-bold' : 'text-sm font-semibold'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function CashRegisterBanner({
  register,
  summary,
  canCharge,
  loading,
  onOpenClick,
  onCloseClick,
}) {
  const state = resolveCashRegisterBannerState({ register, canCharge, loading });
  const shell = resolveCashRegisterBannerShellClass(state.kind);
  const dot = resolveCashRegisterBannerDotClass(state.kind);

  const hasMetrics = Boolean(register && !loading);
  const expected =
    summary && Number.isFinite(summary.expectedCash)
      ? formatPaymentAmount(summary.expectedCash)
      : null;
  const collected =
    summary && Number.isFinite(summary.totalAmount)
      ? formatPaymentAmount(summary.totalAmount)
      : null;

  return (
    <div
      role={state.kind === 'stale' ? 'alert' : 'status'}
      className={`mb-3 shrink-0 rounded-2xl border px-3 py-2.5 sm:px-4 shadow-sm ${shell}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Wallet className="h-3.5 w-3.5 opacity-80 shrink-0" aria-hidden />
              <p className="text-sm font-semibold tracking-tight">{state.title}</p>
              {register?.businessDate && state.kind !== 'closed' ? (
                <span className="text-[11px] font-medium opacity-80">
                  {formatYmd(register.businessDate)}
                </span>
              ) : null}
            </div>
            <p className="text-xs mt-0.5 opacity-90">{state.message}</p>
          </div>
        </div>

        {hasMetrics ? (
          <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:min-w-[18rem]">
            <Metric label="Base" value={formatPaymentAmount(register.openingAmount)} />
            <Metric label="Esperado" value={expected || '—'} emphasize />
            <Metric label="Cobrado" value={collected || '—'} emphasize />
          </div>
        ) : null}

        <div className="flex shrink-0 flex-wrap gap-2">
          {state.showLiveLink ? (
            <Link
              to="/reports?section=cash#cash-live"
              className="rounded-xl border border-current/20 bg-white/80 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-white"
            >
              Ver caja
            </Link>
          ) : null}
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
    </div>
  );
}
