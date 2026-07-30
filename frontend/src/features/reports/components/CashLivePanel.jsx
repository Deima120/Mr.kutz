/**
 * Panel de caja en vivo (Reportes → Caja). Datos del CashRegisterContext (polling).
 * Sin lista de últimos cobros (v1).
 */

import { useEffect } from 'react';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import DataCard from '@/shared/components/admin/DataCard';
import StatsCard from '@/shared/components/admin/StatsCard';
import CashMethodBreakdownList from '@/features/cash-registers/components/CashMethodBreakdownList';
import { useCashRegisterOptional } from '@/features/cash-registers/CashRegisterContext';
import { formatMoney } from '@/shared/utils/money';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

function formatYmd(ymd) {
  if (!ymd) return '—';
  return formatDisplayDate(`${ymd}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CashLivePanel() {
  const cash = useCashRegisterOptional();
  const register = cash?.register;
  const summary = cash?.summary;
  const canCharge = Boolean(cash?.canCharge);
  const loading = Boolean(cash?.loading);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#cash-live') return;
    const el = document.getElementById('cash-live');
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [register?.id]);

  if (!cash || loading) {
    return (
      <DataCard title="Caja en vivo">
        <p className="text-sm text-stone-500">Consultando estado de caja…</p>
      </DataCard>
    );
  }

  if (!register || !canCharge) {
    return null;
  }

  const byMethod = Array.isArray(summary?.byMethod) ? summary.byMethod : [];
  const paymentCount = summary?.paymentCount ?? 0;
  const totalAmount = summary?.totalAmount ?? 0;
  const expectedCash = summary?.expectedCash ?? 0;

  return (
    <div id="cash-live" className="space-y-3 scroll-mt-4">
      {register.isStaleOpen ? (
        <AppInlineAlert variant="error" title="Caja de día anterior" className="text-xs py-2 px-3">
          {register.staleWarning ||
            `Caja del ${register.businessDate} aún abierta. Ciérrala antes de abrir la de hoy.`}
        </AppInlineAlert>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">Caja en vivo</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {formatYmd(register.businessDate)}
            {register.status ? ` · ${register.status}` : ''}
            {' · '}se actualiza sola mientras trabajas
          </p>
        </div>
        <button
          type="button"
          onClick={() => cash.requestClose?.()}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
            register.isStaleOpen
              ? 'border border-red-300 bg-white text-red-900 hover:bg-red-50'
              : 'border border-emerald-300/80 bg-white text-emerald-950 hover:bg-emerald-50'
          }`}
        >
          Cerrar caja
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total cobrado hoy"
          value={formatMoney(totalAmount)}
          sublabel={`${paymentCount} cobro${paymentCount === 1 ? '' : 's'}`}
          variant="primary"
        />
        <StatsCard
          label="Efectivo esperado"
          value={formatMoney(expectedCash)}
          sublabel="Base + efectivo + otros ing. efectivo"
        />
        <StatsCard
          label="Base de apertura"
          value={formatMoney(register.openingAmount)}
          sublabel={register.openedByEmail || '—'}
        />
        <StatsCard
          label="Cobros"
          value={String(paymentCount)}
          sublabel="Vigentes en esta caja"
        />
      </div>

      <DataCard title="Desglose por método de pago">
        <CashMethodBreakdownList
          byMethod={byMethod}
          emptyText="Aún no hay cobros en esta caja."
          className="lg:grid-cols-3"
        />
      </DataCard>
    </div>
  );
}
