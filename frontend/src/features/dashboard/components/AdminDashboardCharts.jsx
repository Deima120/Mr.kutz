/**
 * Gráficos del panel de administración (sin librerías externas).
 */

import { useState } from 'react';
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

const FIGURE_TONES = {
  stone: 'text-stone-900',
  emerald: 'text-emerald-700',
  rose: 'text-rose-700',
  gold: 'text-gold-dark',
  indigo: 'text-indigo-700',
};

const FIGURE_DOTS = {
  stone: 'bg-stone-400',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  gold: 'bg-gold',
  indigo: 'bg-indigo-500',
};

const FIGURE_BARS = {
  stone: 'from-stone-500 to-stone-400',
  emerald: 'from-emerald-600 to-emerald-400',
  rose: 'from-rose-600 to-rose-400',
  gold: 'from-gold-dark via-gold to-gold-light',
  indigo: 'from-indigo-700 via-indigo-500 to-indigo-400',
};

/**
 * Renglón de una cifra dentro de una tarjeta KPI.
 *
 * Va en **una sola columna a lo ancho de la tarjeta**, no en una rejilla de dos.
 * Con dos columnas, cada una queda en ~115px y un monto como "$1.317.000" no
 * cabe: al ser una cadena sin espacios no puede ajustarse sola, así que o se
 * desbordaba sobre la columna vecina o (con `break-words`) se partía en dos
 * renglones dejando el último cero suelto debajo. A lo ancho entero sí cabe
 * entero, sin recortes ni cortes de línea.
 */
function KpiRow({ label, value, pct, tone = 'stone', hint, share }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-stone-600">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${FIGURE_DOTS[tone] || FIGURE_DOTS.stone}`}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </p>
        {pct != null && (
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-stone-500">
            {pct}%
          </span>
        )}
      </div>

      <p
        className={`mt-0.5 whitespace-nowrap font-serif text-xl font-medium leading-tight tabular-nums ${FIGURE_TONES[tone] || FIGURE_TONES.stone}`}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>

      {share != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${FIGURE_BARS[tone] || FIGURE_BARS.stone} transition-all duration-500`}
            style={{ width: `${Math.max(0, Math.min(100, Number(share)))}%` }}
            aria-hidden
          />
        </div>
      )}

      {hint ? <p className="mt-1 text-[11px] text-stone-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Balance del periodo: lo que entró por ventas frente a lo que se comprometió
 * en gastos, y la diferencia entre ambos.
 *
 * Las dos barras verticales que tenía antes se cambiaron por renglones con
 * barra horizontal: en una tarjeta de ~285px, dos barras verticales aportaban
 * poca información y obligaban a apretar los montos en dos columnas donde no
 * cabían. A lo ancho, la proporción se lee igual de bien y el monto cabe entero.
 */
export function BalanceChart({ income, expenses, difference, formatMoney, expensesCount }) {
  const incomeNum = Number(income || 0);
  const expensesNum = Number(expenses || 0);
  const max = Math.max(incomeNum, expensesNum, 1);
  const positive = Number(difference || 0) >= 0;
  // Porcentaje que representa el gasto sobre el ingreso: el dato que de verdad
  // dice si el margen es sano, y que antes no se mostraba en ninguna parte.
  const expenseShare = incomeNum > 0 ? Math.round((expensesNum / incomeNum) * 100) : null;

  return (
    <div className="flex h-full flex-col">
      {/* Los dos renglones se reparten el alto disponible: si el grid estira
          esta tarjeta para igualar a su vecina más alta, el aire sobrante se
          distribuye entre ellos en vez de acumularse en un hueco muerto. */}
      <div className="flex flex-1 flex-col justify-evenly gap-3">
        <KpiRow
          label="Ingresos"
          value={formatMoney(income)}
          tone="emerald"
          share={Math.round((incomeNum / max) * 100)}
        />
        <KpiRow
          label="Gastos"
          value={formatMoney(expenses)}
          tone="rose"
          share={Math.round((expensesNum / max) * 100)}
          hint={
            expensesCount
              ? `${expensesCount} ${expensesCount === 1 ? 'gasto registrado' : 'gastos registrados'}${
                  expenseShare != null ? ` · ${expenseShare}% del ingreso` : ''
                }`
              : 'Sin gastos registrados'
          }
        />
      </div>

      <div
        className={`mt-3 rounded-xl border px-3 py-2.5 ${
          positive ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
        }`}
      >
        <p className="text-[11px] font-medium text-stone-600">Diferencia</p>
        <p
          className={`whitespace-nowrap font-serif text-2xl font-medium leading-tight tabular-nums ${
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

  const secondaryPctSafe = Math.max(0, 100 - Number(primaryPct || 0));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-4 w-full shrink-0 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-500"
          style={{ width: `${primaryPct}%` }}
          aria-hidden
        />
        <div
          className="h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 transition-all duration-500"
          style={{ width: `${secondaryPctSafe}%` }}
          aria-hidden
        />
      </div>

      {/* Un renglón por categoría, a lo ancho de la tarjeta. Antes eran dos
          columnas de ~115px, donde un monto largo no cabía y terminaba
          desbordado sobre el vecino o partido en dos líneas. Además reparten
          el alto sobrante entre ellos (justify-evenly) en vez de dejar el
          hueco muerto que quedaba al fondo. */}
      <div className="flex flex-1 flex-col justify-evenly gap-3 py-3">
        <KpiRow
          label={primaryLabel}
          value={formatValue(primaryValue)}
          pct={primaryPct}
          tone="gold"
          share={primaryPct}
        />
        <KpiRow
          label={secondaryLabel}
          value={formatValue(secondaryValue)}
          pct={secondaryPct}
          tone="indigo"
          share={secondaryPctSafe}
        />
      </div>

      {extraNote ? (
        <p className="shrink-0 border-t border-dashed border-stone-200 pt-2 text-[11px] text-stone-500">
          {extraNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Alto del área de barras de RevenueTrendChart, en píxeles. La altura de cada
 * barra se calcula en JS (px) en vez de en `%`: las columnas viven en una fila
 * `items-end` que no las estira a una altura definida, y un `%` ahí no tiene
 * contra qué resolverse — la barra quedaría invisible.
 */
const REVENUE_BAR_AREA_PX = 176;

/** Fecha larga ("miércoles, 2 de septiembre") a partir de un 'YYYY-MM-DD'. */
function longDayLabel(ymd) {
  // El mediodía evita que el cambio de huso mueva la fecha un día atrás.
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Serie de ingresos por día, seleccionable.
 *
 * Al pasar el ratón, la barra se resalta y muestra su monto encima; al hacer
 * clic queda fija y el panel de arriba muestra el detalle de ese día. Sin
 * selección, el panel muestra el mejor día del periodo. La selección importa
 * sobre todo en móvil, donde no existe el `hover`.
 */
export function RevenueTrendChart({ data, formatMoney, emptyText = 'Sin ventas en el periodo' }) {
  const [selectedDate, setSelectedDate] = useState(null);

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

  // Si cambia el rango de fechas, un día seleccionado antes puede ya no estar
  // en la serie: se resuelve contra los datos actuales en vez de guardarse en
  // otro estado que habría que sincronizar.
  const selected = rows.find((r) => r.date === selectedDate) || null;
  const featured = selected || best;
  const isShowingBest = !selected;

  const average = totalPeriod / rows.length;
  const featuredTotal = Number(featured?.total || 0);
  const vsAverage = average > 0 ? Math.round(((featuredTotal - average) / average) * 100) : 0;

  // Con muchos días las etiquetas se pisan: se muestra una de cada N.
  const labelStep = Math.ceil(rows.length / 12);

  return (
    <div className="flex h-full flex-col">
      {/* Detalle del día destacado o seleccionado. */}
      <div className="mb-4 rounded-xl border border-gold/25 bg-gold/[0.05] px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
              {isShowingBest ? 'Mejor día del periodo' : 'Día seleccionado'}
            </p>
            <p className="mt-0.5 truncate font-serif text-lg font-medium capitalize text-stone-900">
              {longDayLabel(featured.date)}
            </p>
          </div>

          <div className="text-right">
            <p className="whitespace-nowrap font-serif text-2xl font-medium leading-tight tabular-nums text-stone-900">
              {formatMoney(featuredTotal)}
            </p>
            <p className="text-[11px] text-stone-500">
              {Number(featured.count ?? 0)}{' '}
              {Number(featured.count ?? 0) === 1 ? 'venta' : 'ventas'}
              {featuredTotal > 0 && (
                <>
                  {' · '}
                  <span className={vsAverage >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                    {vsAverage >= 0 ? '+' : ''}
                    {vsAverage}% vs. promedio
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {selected && (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="mt-1.5 text-[11px] font-semibold text-gold-dark underline-offset-2 hover:underline"
          >
            Volver al mejor día
          </button>
        )}
      </div>

      <div className="relative" style={{ height: `${REVENUE_BAR_AREA_PX}px` }}>
        <ChartGridLines />
        <div className="absolute inset-0 flex items-end gap-1 px-0.5">
          {rows.map((d) => {
            const value = Number(d.total || 0);
            const height = Math.max(2, Math.round((value / max) * REVENUE_BAR_AREA_PX));
            const isSelected = selected?.date === d.date;
            const isBest = !selected && best?.date === d.date && value > 0;
            const highlighted = isSelected || isBest;

            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : d.date)}
                aria-pressed={isSelected}
                title={`${d.label}: ${formatMoney(value)}`}
                className="group relative flex min-w-0 flex-1 cursor-pointer flex-col justify-end rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                {/* Monto flotante: siempre visible en la barra destacada, y al
                    pasar el ratón en cualquier otra. */}
                <span
                  className={`pointer-events-none absolute inset-x-0 -top-0.5 z-10 truncate text-center text-[10px] font-semibold tabular-nums text-stone-700 transition-opacity ${
                    highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {formatMoney(value)}
                </span>

                <span
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    highlighted
                      ? 'bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm'
                      : 'bg-gradient-to-t from-stone-400/90 to-stone-300/80 group-hover:from-gold-dark/80 group-hover:to-gold-light/80'
                  }`}
                  style={{ height: `${height}px` }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Las etiquetas van fuera del contenedor de altura fija: dentro quedaban
          recortadas contra el borde inferior. */}
      <div className="mt-1.5 flex gap-1 px-0.5">
        {rows.map((d, idx) => (
          <span
            key={d.date}
            className={`w-full min-w-0 truncate text-center text-[10px] transition-colors ${
              selected?.date === d.date ? 'font-semibold text-gold-dark' : 'text-stone-500'
            } ${idx % labelStep === 0 || selected?.date === d.date ? '' : 'invisible'}`}
          >
            {d.label}
          </span>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-dashed border-stone-200 pt-3 text-center">
        <div>
          <p className="text-[11px] text-stone-500">Total del periodo</p>
          <p className="whitespace-nowrap font-semibold tabular-nums text-stone-800">
            {formatMoney(totalPeriod)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-stone-500">Promedio diario</p>
          <p className="whitespace-nowrap font-semibold tabular-nums text-stone-800">
            {formatMoney(Math.round(average))}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-stone-500">Días con venta</p>
          <p className="font-semibold tabular-nums text-stone-800">
            {rows.filter((d) => Number(d.total || 0) > 0).length} de {rows.length}
          </p>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-stone-400">
        Toca una barra para ver el detalle de ese día
      </p>
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
    <div className="flex h-full flex-col">
      {/* Barra de composición: misma lectura visual que las otras tarjetas de
          la fila y, de paso, resume los cuatro estados de un vistazo. */}
      <div className="flex h-4 w-full shrink-0 overflow-hidden rounded-full bg-stone-100">
        {rows.map((row) => {
          const pct = Math.round((Number(row.value || 0) / safeTotal) * 100);
          if (pct <= 0) return null;
          return (
            <div
              key={row.label}
              className={`h-full bg-gradient-to-r ${row.bar} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${row.label}: ${row.value} (${pct}%)`}
              aria-hidden
            />
          );
        })}
      </div>

      {/* Los cuatro renglones reparten el alto disponible entre sí. */}
      <div className="flex flex-1 flex-col justify-evenly gap-2.5 py-3">
        {rows.map((row) => {
          const value = Number(row.value || 0);
          const pct = Math.round((value / safeTotal) * 100);
          return (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-stone-700">{row.label}</span>
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
      </div>

      <p className="shrink-0 border-t border-dashed border-stone-200 pt-2.5 text-[11px] text-stone-500">
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
