/**
 * Gráficos compactos para el panel del barbero (sin librerías externas).
 */

import { useId } from 'react';

export function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

/** Barras duales: ingresos (oro) y cortes (piedra) por día — últimos 7 días. */
export function BarberDualBarChart({ data, className = '' }) {
  if (!data?.length) return null;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const maxCuts = Math.max(...data.map((d) => d.cuts), 1);
  const barMax = 112;

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2 min-h-[9.5rem] px-0.5 border-b border-stone-200/80 pb-1">
        {data.map((d) => {
          const hRev = Math.max(0, Math.round((d.revenue / maxRev) * barMax));
          const hCuts = Math.max(0, Math.round((d.cuts / maxCuts) * barMax));
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 max-w-[3.5rem] mx-auto">
              <div className="flex items-end justify-center gap-0.5 w-full h-28">
                <div
                  className="w-[46%] max-w-[18px] rounded-t-md bg-gradient-to-t from-gold-dark via-gold to-gold-light shadow-sm ring-1 ring-gold/20 transition-all duration-300"
                  style={{ height: `${Math.max(d.revenue > 0 ? 6 : 0, hRev)}px` }}
                  title={`${formatCOP(d.revenue)}`}
                />
                <div
                  className="w-[46%] max-w-[18px] rounded-t-md bg-gradient-to-t from-stone-800 to-stone-600 shadow-sm transition-all duration-300"
                  style={{ height: `${Math.max(d.cuts > 0 ? 6 : 0, hCuts)}px` }}
                  title={`${d.cuts} servicios`}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-stone-500 font-medium text-center leading-tight truncate w-full px-0.5">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-4 text-xs text-stone-600">
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-gold to-gold-light shadow-sm" aria-hidden />
          Ingresos cobrados
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-stone-700 shadow-sm" aria-hidden />
          Servicios completados
        </span>
      </div>
    </div>
  );
}

/** Donut / anillo de progreso para citas del día (completadas vs total). */
export function TodayAppointmentsRing({ total, completed, pending }) {
  const gradId = useId().replace(/:/g, '');
  const t = total || 0;
  const c = completed || 0;
  const pct = t > 0 ? Math.round((c / t) * 100) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-stone-200" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#713f12" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-serif text-2xl font-semibold text-stone-900">{t}</span>
          <span className="text-[10px] tracking-wider text-stone-500 font-semibold">Citas hoy</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm w-full max-w-xs">
        <li className="flex justify-between gap-4 py-2 border-b border-stone-100">
          <span className="text-stone-600">Completadas</span>
          <span className="font-semibold text-emerald-700 tabular-nums">{c}</span>
        </li>
        <li className="flex justify-between gap-4 py-2 border-b border-stone-100">
          <span className="text-stone-600">Pendientes / en curso</span>
          <span className="font-semibold text-amber-800 tabular-nums">{pending}</span>
        </li>
        <li className="flex justify-between gap-4 py-2 text-stone-500 text-xs">
          <span>Progreso del día</span>
          <span className="tabular-nums">{pct}%</span>
        </li>
      </ul>
    </div>
  );
}
