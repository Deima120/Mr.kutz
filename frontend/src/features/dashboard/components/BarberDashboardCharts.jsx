/**
 * Gráficos compactos para el panel del barbero (sin librerías externas).
 */

import { useId } from 'react';

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
