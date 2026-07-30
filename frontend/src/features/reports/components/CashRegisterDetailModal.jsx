/**
 * Detalle de una sesión de caja con secciones alineadas a Reportes.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import * as cashRegisterService from '@/features/cash-registers/services/cashRegisterService';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { formatMoney } from '@/shared/utils/money';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

function formatYmd(ymd) {
  if (!ymd) return '—';
  return formatDisplayDate(`${ymd}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Section({ title, subtitle, children, footerLink }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50/60 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5 border-b border-stone-200/80 bg-white/70">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          {subtitle ? <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {footerLink}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function MetricGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-white border border-stone-100 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{item.label}</p>
          <p className={`text-sm font-semibold tabular-nums mt-0.5 ${item.tone || 'text-stone-900'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ children }) {
  return <p className="text-xs text-stone-500">{children}</p>;
}

function SectionLink({ to }) {
  return (
    <Link
      to={to}
      className="text-[11px] font-semibold text-barber-dark hover:underline shrink-0"
    >
      Ver sección
    </Link>
  );
}

export default function CashRegisterDetailModal({ registerId, onClose }) {
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!registerId) return undefined;
    let cancelled = false;
    setLoading(true);
    setSummary(null);
    cashRegisterService
      .getSummary(registerId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.message || 'No se pudo cargar el detalle de caja');
          onClose?.();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // onClose es estable en uso (cierra el modal); no re-fetch por identidad de callback
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar registerId
  }, [registerId, toast]);

  if (!registerId) return null;

  const reg = summary?.register;
  const sections = summary?.sections;
  const cash = sections?.cash;
  const sales = sections?.sales;
  const otherIncomes = sections?.otherIncomes;
  const expenses = sections?.expenses;
  const commissions = sections?.commissions;
  const portfolio = sections?.portfolio;

  const diffTone =
    cash?.cashDifference == null
      ? 'text-stone-900'
      : cash.cashDifference === 0
        ? 'text-emerald-700'
        : cash.cashDifference > 0
          ? 'text-amber-700'
          : 'text-red-700';

  return (
    <AdminModalShell
      open
      onClose={onClose}
      title={reg ? `Caja · ${formatYmd(reg.businessDate)}` : 'Detalle de caja'}
      subtitle={reg ? `${reg.status}${reg.isStaleOpen ? ' · STALE' : ''}` : 'Cargando…'}
      size="2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-semibold text-stone-800"
        >
          Cerrar
        </button>
      }
    >
      {loading || !summary ? (
        <p className="text-sm text-stone-500 py-8 text-center">Cargando detalle…</p>
      ) : (
        <div className="space-y-3">
          <Section
            title="Caja"
            subtitle="Base, esperado y contado"
            footerLink={<SectionLink to="/reports?section=cash" />}
          >
            <MetricGrid
              items={[
                { label: 'Base', value: formatMoney(cash?.openingAmount ?? 0) },
                { label: 'Efectivo cobrado', value: formatMoney(cash?.cashCollected ?? 0) },
                {
                  label: 'Otros ing. efectivo',
                  value: formatMoney(cash?.cashOtherIncomes ?? 0),
                },
                { label: 'Esperado', value: formatMoney(cash?.expectedCash ?? 0), tone: 'text-gold' },
                {
                  label: 'Contado',
                  value: cash?.countedCash != null ? formatMoney(cash.countedCash) : '—',
                },
                {
                  label: 'Diferencia',
                  value: cash?.cashDifference != null ? formatMoney(cash.cashDifference) : '—',
                  tone: diffTone,
                },
              ]}
            />
            <div className="mt-3 grid gap-1 text-xs text-stone-600">
              <p>
                Abierta por: <span className="font-medium text-stone-800">{cash?.openedByEmail || '—'}</span>
              </p>
              <p>
                Cerrada por: <span className="font-medium text-stone-800">{cash?.closedByEmail || '—'}</span>
              </p>
              {cash?.notes ? (
                <p>
                  Notas: <span className="text-stone-800">{cash.notes}</span>
                </p>
              ) : null}
            </div>
          </Section>

          <Section
            title="Ventas"
            subtitle={`${sales?.paymentCount ?? 0} cobro(s) · ${formatMoney(sales?.totalAmount ?? 0)}`}
            footerLink={<SectionLink to="/reports?section=sales" />}
          >
            {(sales?.byMethod || []).length === 0 ? (
              <EmptyHint>Sin cobros en esta caja.</EmptyHint>
            ) : (
              <ul className="space-y-1.5">
                {sales.byMethod.map((m) => (
                  <li
                    key={m.paymentMethodId}
                    className="flex items-center justify-between gap-2 text-xs rounded-lg bg-white border border-stone-100 px-2.5 py-2"
                  >
                    <span className="font-medium text-stone-800">
                      {m.paymentMethodName || `Método #${m.paymentMethodId}`}
                      {m.isCash ? (
                        <span className="ml-1 text-[10px] font-semibold text-emerald-700">efectivo</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums font-semibold text-stone-900">
                      {formatMoney(m.amount)}
                      <span className="ml-2 text-stone-400 font-normal">{m.paymentCount}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Otros ingresos"
            subtitle={`${otherIncomes?.count ?? 0} · ${formatMoney(otherIncomes?.total ?? 0)}`}
            footerLink={<SectionLink to="/reports?section=other-incomes" />}
          >
            {(otherIncomes?.items || []).length === 0 ? (
              <EmptyHint>Sin otros ingresos en esta caja.</EmptyHint>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {otherIncomes.items.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-2 text-xs rounded-lg bg-white border border-stone-100 px-2.5 py-2"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-stone-800 block truncate">{row.description}</span>
                      <span className="text-stone-500">
                        {row.paymentMethodName || '—'}
                        {row.paymentMethodIsCash ? ' · efectivo' : ''}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold shrink-0">{formatMoney(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Gastos"
            subtitle={`${expenses?.count ?? 0} del día · ${formatMoney(expenses?.total ?? 0)}`}
            footerLink={<SectionLink to="/reports?section=expenses" />}
          >
            {(expenses?.items || []).length === 0 ? (
              <EmptyHint>Sin gastos registrados ese día.</EmptyHint>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {expenses.items.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-2 text-xs rounded-lg bg-white border border-stone-100 px-2.5 py-2"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-stone-800 block truncate">
                        {row.categoryName || 'Sin categoría'}
                      </span>
                      {row.notes ? <span className="text-stone-500 line-clamp-1">{row.notes}</span> : null}
                    </span>
                    <span className="tabular-nums font-semibold shrink-0">{formatMoney(row.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Comisiones"
            subtitle={`${commissions?.count ?? 0} · ${formatMoney(commissions?.total ?? 0)}`}
            footerLink={<SectionLink to="/reports?section=commissions" />}
          >
            {(commissions?.byBarber || []).length === 0 ? (
              <EmptyHint>Sin comisiones en los cobros de esta caja.</EmptyHint>
            ) : (
              <ul className="space-y-1.5">
                {commissions.byBarber.map((b) => (
                  <li
                    key={b.barberId}
                    className="flex items-center justify-between gap-2 text-xs rounded-lg bg-white border border-stone-100 px-2.5 py-2"
                  >
                    <span className="font-medium text-stone-800">
                      {b.barberName || `Barbero #${b.barberId}`}
                      <span className="ml-2 text-stone-400 font-normal">{b.count}</span>
                    </span>
                    <span className="tabular-nums font-semibold">{formatMoney(b.totalCommission)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Cartera"
            subtitle={`${portfolio?.count ?? 0} cita(s) completada(s) sin cobro ese día`}
            footerLink={<SectionLink to="/reports?section=portfolio" />}
          >
            {(portfolio?.items || []).length === 0 ? (
              <EmptyHint>Sin pendientes de cobro ese día.</EmptyHint>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {portfolio.items.map((a) => (
                  <li
                    key={a.id}
                    className="text-xs rounded-lg bg-white border border-amber-100 px-2.5 py-2 text-amber-950"
                  >
                    <span className="font-semibold">#{a.id}</span>
                    {' · '}
                    {a.clientName}
                    {' · '}
                    {a.serviceName}
                    {a.startTime ? ` · ${a.startTime}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <p className="text-[11px] text-stone-500 px-1">
            Inventario no depende de la sesión de caja.{' '}
            <Link to="/reports?section=inventory" className="font-semibold text-barber-dark hover:underline">
              Ver reporte de inventario
            </Link>
          </p>
        </div>
      )}
    </AdminModalShell>
  );
}
