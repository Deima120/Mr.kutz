/**
 * Gráficos del panel de administración (sin librerías externas).
 */

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

/** Barras horizontales para rankings (servicios, barberos). */
export function HorizontalBarsChart({ title, subtitle, items, emptyText, valueSuffix = 'citas' }) {
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
                    {it.count} {valueSuffix}
                  </span>
                </div>
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
    </div>
  );
}
