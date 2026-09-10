/**
 * Gráficos del panel de administración (sin librerías externas).
 */

import { Star } from 'lucide-react';
import { TodayAppointmentsRing } from './BarberDashboardCharts';

export { TodayAppointmentsRing };

const BAR_TONES = {
  emerald: 'bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 shadow-sm',
  amber: 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 shadow-sm',
  gold: 'bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm',
  indigo: 'bg-gradient-to-t from-indigo-800 via-indigo-600 to-indigo-400 shadow-sm',
  violet: 'bg-gradient-to-t from-violet-800 via-violet-600 to-violet-400 shadow-sm',
  sky: 'bg-gradient-to-t from-sky-800 via-sky-600 to-sky-400 shadow-sm',
  rose: 'bg-gradient-to-t from-rose-800 via-rose-600 to-rose-400 shadow-sm',
  cyan: 'bg-gradient-to-t from-cyan-800 via-cyan-600 to-cyan-400 shadow-sm',
  stone: 'bg-gradient-to-t from-stone-700 to-stone-500 shadow-sm',
};

function ChartGridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      <span className="h-px w-full bg-stone-200/90" aria-hidden />
      <span className="h-px w-full bg-stone-200/90" aria-hidden />
      <span className="h-px w-full bg-stone-200/90" aria-hidden />
      <span className="h-px w-full bg-stone-200/90" aria-hidden />
      <span className="h-px w-full bg-stone-200/90" aria-hidden />
    </div>
  );
}

/** Barras duales verticales para KPIs del periodo. */
export function DualBarKpiChart({
  leftLabel,
  leftValue,
  leftValueText,
  rightLabel,
  rightValue,
  rightValueText,
  leftTone = 'gold',
  rightTone = 'stone',
  height = 168,
}) {
  const max = Math.max(Number(leftValue || 0), Number(rightValue || 0), 1);
  const leftHeight = Math.max(12, Math.round((Number(leftValue || 0) / max) * height));
  const rightHeight = Math.max(12, Math.round((Number(rightValue || 0) / max) * height));

  return (
    <div className="relative min-h-[13.5rem] sm:min-h-[14.5rem]">
      <ChartGridLines />
      <div className="absolute inset-0 flex items-end justify-center gap-10 px-2 pb-1 sm:gap-12 sm:px-4">
        <div className="flex w-20 flex-col items-center gap-2.5">
          <div
            className={`w-full max-w-[3.25rem] rounded-t-lg ${BAR_TONES[leftTone] || BAR_TONES.gold}`}
            style={{ height: `${leftHeight}px` }}
            title={`${leftLabel}: ${leftValueText}`}
            aria-label={`${leftLabel} ${leftValueText}`}
          />
          <div className="text-center">
            <p className="text-[11px] font-medium text-stone-600">{leftLabel}</p>
            <p className="text-sm font-semibold tabular-nums text-stone-900">{leftValueText}</p>
          </div>
        </div>

        <div className="flex w-20 flex-col items-center gap-2.5">
          <div
            className={`w-full max-w-[3.25rem] rounded-t-lg ${BAR_TONES[rightTone] || BAR_TONES.stone}`}
            style={{ height: `${rightHeight}px` }}
            title={`${rightLabel}: ${rightValueText}`}
            aria-label={`${rightLabel} ${rightValueText}`}
          />
          <div className="text-center">
            <p className="text-[11px] font-medium text-stone-600">{rightLabel}</p>
            <p className="text-sm font-semibold tabular-nums text-stone-900">{rightValueText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Barras horizontales para rankings (servicios, barberos, productos).
 *
 * `formatValue` permite mostrar dinero en vez de un conteo con sufijo; si no se
 * pasa, se conserva el comportamiento de siempre (`count` + `valueSuffix`).
 */
export function HorizontalBarsChart({
  title,
  subtitle,
  items,
  emptyText,
  valueSuffix = 'citas',
  formatValue,
  hint,
}) {
  const max = Math.max(...(items || []).map((i) => i.count), 1);

  return (
    <div className="flex h-full min-h-[16rem] flex-col">
      <div className="mb-4">
        <h3 className="font-serif text-base font-medium text-stone-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      </div>

      {items?.length ? (
        <div className="flex-1 space-y-3.5">
          {items.map((it, idx) => {
            const pct = Math.round((it.count / max) * 100);
            return (
              <div key={`${it.label || idx}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-stone-700">{it.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-gold">
                    {formatValue ? formatValue(it) : `${it.count} ${valueSuffix}`}
                  </span>
                </div>
                {it.note ? (
                  <p className="text-[11px] text-stone-500">{it.note}</p>
                ) : null}
                <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="flex flex-1 items-center text-sm text-stone-500">{emptyText}</p>
      )}

      {hint && items?.length ? (
        <p className="mt-4 border-t border-dashed border-stone-200 pt-3 text-[11px] text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Indicadores de negocio del panel del administrador                        */
/* ------------------------------------------------------------------------ */

/** Cifra grande con su etiqueta, usada dentro de las tarjetas KPI. */
function KpiFigure({ label, value, tone = 'stone', hint }) {
  const TONES = {
    stone: 'text-stone-900',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    gold: 'text-gold-dark',
  };
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-stone-500">{label}</p>
      <p className={`truncate font-serif text-xl font-medium tabular-nums ${TONES[tone] || TONES.stone}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-stone-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Balance del periodo: lo que entró por ventas frente a lo que se comprometió
 * en gastos, y la diferencia entre ambos.
 */
export function BalanceChart({ income, expenses, difference, formatMoney, expensesCount }) {
  const max = Math.max(Number(income || 0), Number(expenses || 0), 1);
  const incomeH = Math.max(6, Math.round((Number(income || 0) / max) * 100));
  const expensesH = Math.max(6, Math.round((Number(expenses || 0) / max) * 100));
  const positive = Number(difference || 0) >= 0;

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-end gap-4">
        <div className="flex h-28 flex-1 items-end gap-4">
          <div className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-[3rem] rounded-t-lg bg-gradient-to-t from-emerald-700 via-emerald-600 to-emerald-400 shadow-sm"
              style={{ height: `${incomeH}%` }}
              aria-hidden
            />
            <span className="text-[11px] font-medium text-stone-600">Ingresos</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-[3rem] rounded-t-lg bg-gradient-to-t from-rose-700 via-rose-600 to-rose-400 shadow-sm"
              style={{ height: `${expensesH}%` }}
              aria-hidden
            />
            <span className="text-[11px] font-medium text-stone-600">Gastos</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-stone-200/80 pt-3">
        <KpiFigure label="Ingresos" value={formatMoney(income)} tone="emerald" />
        <KpiFigure
          label="Gastos"
          value={formatMoney(expenses)}
          tone="rose"
          hint={expensesCount ? `${expensesCount} registrados` : null}
        />
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 ${
          positive
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-rose-200 bg-rose-50/70'
        }`}
      >
        <p className="text-[11px] font-medium text-stone-600">Diferencia</p>
        <p
          className={`font-serif text-2xl font-medium tabular-nums ${
            positive ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {formatMoney(difference)}
        </p>
        <p className="mt-0.5 text-[11px] text-stone-500">Ventas menos gastos de abastecimiento</p>
      </div>
    </div>
  );
}

/** Barra apilada de dos categorías con leyenda (servicios vs productos, etc.). */
export function SplitCompositionChart({
  primaryLabel,
  primaryValue,
  primaryPct,
  secondaryLabel,
  secondaryValue,
  secondaryPct,
  formatValue,
  emptyText = 'Sin datos en el periodo',
  extraNote,
}) {
  const total = Number(primaryValue || 0) + Number(secondaryValue || 0);

  if (total <= 0) {
    return <p className="flex h-full min-h-[8rem] items-center text-sm text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500"
          style={{ width: `${primaryPct}%` }}
          aria-hidden
        />
        <div
          className="h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 transition-all duration-500"
          style={{ width: `${Math.max(0, 100 - Number(primaryPct || 0))}%` }}
          aria-hidden
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
            <span className="inline-block h-2 w-2 rounded-full bg-gold" aria-hidden />
            {primaryLabel}
          </p>
          <p className="font-serif text-xl font-medium tabular-nums text-stone-900">
            {formatValue(primaryValue)}
          </p>
          <p className="text-[11px] text-stone-500">{primaryPct}% del total</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
            {secondaryLabel}
          </p>
          <p className="font-serif text-xl font-medium tabular-nums text-stone-900">
            {formatValue(secondaryValue)}
          </p>
          <p className="text-[11px] text-stone-500">{secondaryPct}% del total</p>
        </div>
      </div>

      {extraNote ? (
        <p className="border-t border-dashed border-stone-200 pt-2 text-[11px] text-stone-500">
          {extraNote}
        </p>
      ) : null}
    </div>
  );
}

/** Serie de barras verticales con el ingreso de cada día del periodo. */
export function RevenueTrendChart({ data, formatMoney, emptyText = 'Sin ventas en el periodo' }) {
  const rows = data || [];
  const max = Math.max(...rows.map((d) => Number(d.total || 0)), 1);
  const totalPeriod = rows.reduce((sum, d) => sum + Number(d.total || 0), 0);
  const best = rows.reduce(
    (acc, d) => (Number(d.total || 0) > Number(acc?.total || 0) ? d : acc),
    null
  );

  if (!rows.length || totalPeriod <= 0) {
    return <p className="flex h-full min-h-[12rem] items-center text-sm text-stone-500">{emptyText}</p>;
  }

  // Con muchos días las etiquetas se pisan: se muestra una de cada N.
  const labelStep = Math.ceil(rows.length / 12);

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-48 sm:h-56">
        <ChartGridLines />
        <div className="absolute inset-0 flex items-end gap-1 px-0.5 pb-0">
          {rows.map((d, idx) => {
            const height = Math.max(2, Math.round((Number(d.total || 0) / max) * 100));
            const isBest = best && d.date === best.date && Number(d.total) > 0;
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${
                    isBest
                      ? 'bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm'
                      : 'bg-gradient-to-t from-stone-400/90 to-stone-300/80 hover:from-gold-dark hover:to-gold-light'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${d.label}: ${formatMoney(d.total)}`}
                  aria-label={`${d.label}: ${formatMoney(d.total)}`}
                />
                <span
                  className={`mt-1.5 w-full truncate text-center text-[10px] text-stone-500 ${
                    idx % labelStep === 0 ? '' : 'invisible'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {best ? (
        <p className="mt-3 border-t border-dashed border-stone-200 pt-3 text-[11px] text-stone-500">
          Mejor día: <span className="font-semibold text-stone-700">{best.label}</span> con{' '}
          <span className="font-semibold text-gold-dark">{formatMoney(best.total)}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Cumplimiento de la agenda: completadas, canceladas e inasistencias. */
export function AgendaHealthChart({ completed, cancelled, noShow, pending, total }) {
  const rows = [
    { label: 'Completadas', value: completed, bar: 'from-emerald-600 to-emerald-400', text: 'text-emerald-700' },
    { label: 'Pendientes', value: pending, bar: 'from-amber-500 to-amber-300', text: 'text-amber-700' },
    { label: 'Canceladas', value: cancelled, bar: 'from-stone-500 to-stone-400', text: 'text-stone-700' },
    { label: 'No asistió', value: noShow, bar: 'from-rose-600 to-rose-400', text: 'text-rose-700' },
  ];
  const safeTotal = Number(total || 0);

  if (safeTotal <= 0) {
    return (
      <p className="flex h-full min-h-[10rem] items-center text-sm text-stone-500">
        Sin citas agendadas en el periodo
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const value = Number(row.value || 0);
        const pct = Math.round((value / safeTotal) * 100);
        return (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-stone-700">{row.label}</span>
              <span className={`shrink-0 font-semibold tabular-nums ${row.text}`}>
                {value} <span className="text-xs font-normal text-stone-500">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${row.bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
      <p className="border-t border-dashed border-stone-200 pt-2.5 text-[11px] text-stone-500">
        {safeTotal} citas agendadas en el periodo
      </p>
    </div>
  );
}

/** Promedio de satisfacción con su distribución de 5 a 1 estrellas. */
export function RatingsSummaryChart({ average, count, distribution }) {
  if (!count) {
    return (
      <p className="flex h-full min-h-[10rem] items-center text-sm text-stone-500">
        Aún no hay valoraciones de clientes en el periodo
      </p>
    );
  }

  const levels = [5, 4, 3, 2, 1];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-end gap-3">
        <p className="font-serif text-4xl font-medium leading-none tabular-nums text-stone-900">
          {Number(average).toFixed(1)}
        </p>
        <div className="pb-1">
          <div className="flex gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                className={n <= Math.round(Number(average)) ? 'fill-gold text-gold' : 'text-stone-300'}
                strokeWidth={1.8}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">
            {count} {count === 1 ? 'valoración' : 'valoraciones'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {levels.map((level) => {
          const value = Number(distribution?.[level] ?? 0);
          const pct = count > 0 ? Math.round((value / count) * 100) : 0;
          return (
            <div key={level} className="flex items-center gap-2.5">
              <span className="flex w-8 shrink-0 items-center gap-0.5 text-xs text-stone-600">
                {level}
                <Star size={11} className="fill-gold text-gold" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-stone-600">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Ranking de barberos por calificación promedio recibida. */
export function BarberRatingRanking({ items, emptyText = 'Sin valoraciones en el periodo' }) {
  const rows = items || [];

  if (!rows.length) {
    return <p className="flex h-full min-h-[10rem] items-center text-sm text-stone-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((b, idx) => (
        <li key={b.barberId ?? idx} className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
              idx === 0 ? 'bg-gold/15 text-gold-dark' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-800">{b.name}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
                style={{ width: `${Math.round((Number(b.average) / 5) * 100)}%` }}
                aria-hidden
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center gap-1 text-sm font-semibold tabular-nums text-stone-900">
              {Number(b.average).toFixed(1)}
              <Star size={12} className="fill-gold text-gold" strokeWidth={1.8} aria-hidden />
            </p>
            <p className="text-[11px] text-stone-500">
              {b.count} {b.count === 1 ? 'reseña' : 'reseñas'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
