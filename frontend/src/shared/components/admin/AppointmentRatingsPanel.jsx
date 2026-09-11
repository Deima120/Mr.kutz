/**
 * Resumen de valoraciones de citas (promedio, distribución, comentarios recientes)
 */

import { Star } from 'lucide-react';
import RatingStars from './RatingStars';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';

function StarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-stone-600">{label}</span>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-stone-700">{count}</span>
    </div>
  );
}

function formatRatedDate(d) {
  if (!d) return '';
  return formatDisplayDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
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
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-900">{r.clientName}</span>
              <span
                className="inline-flex items-center tabular-nums text-amber-600"
                aria-label={`${r.rating} de 5 estrellas`}
              >
                <RatingStars value={r.rating} sizeClass="w-4 h-4" />
              </span>
            </div>
            {meta ? <p className="mb-1.5 text-xs text-stone-500">{meta}</p> : null}
            {r.comment ? (
              <p className="italic text-stone-700">"{r.comment}"</p>
            ) : (
              !commentsOnly && <p className="text-xs text-stone-400">Sin comentario</p>
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
  const body = (() => {
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

    const totalRecent = summary.recent?.length ?? 0;
    const shownRecent = recent?.length ?? 0;

    return (
      <div className="space-y-6">
        {/* Promedio y total de valoraciones. Deliberadamente NO se muestra un
            porcentaje de "recomendación": sería un número inventado a partir de
            las estrellas, y el propietario lo descartó por innecesario. */}
        <div className={`flex flex-wrap items-end gap-8 ${compact ? '' : 'sm:gap-12'}`}>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
              Promedio
            </p>
            <p className={`font-serif font-medium text-stone-900 ${compact ? 'text-3xl' : 'text-4xl'}`}>
              {summary.average != null ? summary.average.toFixed(1) : '—'}
              <Star
                className="ml-1.5 inline-block h-6 w-6 align-[-0.15em] fill-gold text-gold"
                strokeWidth={1.5}
                aria-hidden
              />
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
              Valoraciones
            </p>
            <p
              className={`font-serif font-medium tabular-nums text-stone-900 ${compact ? 'text-3xl' : 'text-4xl'}`}
            >
              {summary.count}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
            Distribución
          </p>
          {[5, 4, 3, 2, 1].map((n) => (
            <StarRow key={n} label={`${n} estrellas`} count={dist[n] || 0} max={maxBar} />
          ))}
        </div>

        {recent?.length > 0 && (
          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
                Últimos comentarios
              </p>
              {shownRecent < totalRecent && (
                <span className="text-xs text-stone-400">
                  Mostrando {shownRecent} de {totalRecent}
                </span>
              )}
            </div>
            <RecentCommentsList recent={recent} compact={compact} commentsOnly={false} />
          </div>
        )}
      </div>
    );
  })();

  // Los filtros deben permanecer visibles aunque no haya valoraciones (cambio de barbero/periodo).
  if (commentsOnly || !filtersSlot) {
    return body;
  }

  return (
    <div className="space-y-6">
      {filtersSlot}
      {body}
    </div>
  );
}
