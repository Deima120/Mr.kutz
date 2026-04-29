/**
 * Resumen de valoraciones de citas (promedio, distribución, comentarios recientes)
 */

import { Star } from 'lucide-react';
import RatingStars from './RatingStars';

function StarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-stone-600 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden min-w-0">
        <div
          className="h-full bg-gold/80 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-stone-700 font-medium tabular-nums shrink-0">{count}</span>
    </div>
  );
}

function formatRatedDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RecentCommentsList({ recent, compact, commentsOnly }) {
  if (!recent?.length) return null;
  return (
    <ul
      className={`space-y-3 overflow-y-auto pr-1 ${compact ? 'max-h-56' : commentsOnly ? 'max-h-[28rem]' : 'max-h-80'}`}
    >
      {recent.map((r) => {
        const meta = [r.serviceName, r.barberName, formatRatedDate(r.date)].filter(Boolean).join(' · ');
        return (
          <li
            key={`${r.appointmentId}-${r.date}`}
            className="p-4 rounded-xl bg-stone-50/90 border border-stone-100 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-stone-900">{r.clientName}</span>
              <span className="text-amber-600 font-medium tabular-nums inline-flex items-center" aria-label={`${r.rating} de 5 estrellas`}>
                <RatingStars value={r.rating} sizeClass="w-3.5 h-3.5" />
              </span>
            </div>
            {meta ? <p className="text-stone-500 text-xs mb-1">{meta}</p> : null}
            {r.comment ? (
              <p className="text-stone-700 italic">"{r.comment}"</p>
            ) : (
              !commentsOnly && <p className="text-stone-400 text-xs">Sin comentario</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function AppointmentRatingsPanel({
  summary,
  loading,
  error,
  filtersSlot,
  emptyHint,
  compact = false,
  /** Si se define, solo se muestran los N primeros comentarios recientes */
  recentLimit,
  /** Solo lista de estrellas + comentarios (sin promedio, totales ni distribución) — p. ej. landing pública */
  commentsOnly = false,
}) {
  if (loading) {
    return (
      <div className="py-10 text-center text-stone-500 text-sm">
        Cargando valoraciones…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
        {error}
      </div>
    );
  }
  if (!summary || summary.count === 0) {
    return (
      <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/80">
        <p className="text-stone-600 text-sm">
          {emptyHint || 'Aún no hay valoraciones de citas en este periodo.'}
        </p>
      </div>
    );
  }

  const dist = summary.distribution || {};
  const maxBar = Math.max(1, ...[1, 2, 3, 4, 5].map((k) => dist[k] || 0));
  const recent =
    summary.recent && recentLimit != null && recentLimit > 0
      ? summary.recent.slice(0, recentLimit)
      : summary.recent;

  if (commentsOnly) {
    return (
      <div className="space-y-4">
        {recent?.length > 0 ? (
          <RecentCommentsList recent={recent} compact={compact} commentsOnly />
        ) : (
          <div className="py-6 text-center text-stone-500 text-sm">
            {emptyHint || 'Aún no hay comentarios para mostrar.'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filtersSlot}
      <div className={`flex flex-wrap items-end gap-6 ${compact ? '' : 'sm:gap-10'}`}>
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Promedio</p>
          <p className={`font-serif text-stone-900 font-medium ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {summary.average != null ? summary.average.toFixed(1) : '—'}
            <Star
              className="inline-block w-5 h-5 ml-1 align-[-0.15em] fill-gold text-gold"
              strokeWidth={1.5}
              aria-hidden
            />
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Valoraciones</p>
          <p className="text-2xl font-semibold text-stone-800 tabular-nums">{summary.count}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Distribución</p>
        {[5, 4, 3, 2, 1].map((n) => (
          <StarRow key={n} label={`${n} estrellas`} count={dist[n] || 0} max={maxBar} />
        ))}
      </div>

      {recent?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Últimos comentarios</p>
          <RecentCommentsList recent={recent} compact={compact} commentsOnly={false} />
        </div>
      )}
    </div>
  );
}
