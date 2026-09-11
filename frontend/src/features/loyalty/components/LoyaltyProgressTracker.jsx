/**
 * Indicador visual de avance hacia el próximo hito — una fila de círculos que
 * se van marcando conforme el cliente completa servicios (el "ir tachando" que
 * pidió el propietario). No es un calendario de fechas: cada círculo es "un
 * servicio más", no "un día".
 */

import { Check } from 'lucide-react';

/**
 * @param {{ everyCount: number, remaining: number, label: string }} nextMilestone
 *   Misma forma que devuelve `getClientLoyaltyProgress` — `remaining` es lo que
 *   falta para el próximo hito, así que `everyCount - remaining` es lo ya
 *   avanzado del ciclo actual.
 */
export default function LoyaltyProgressTracker({ everyCount, remaining, label }) {
  const done = Math.max(0, Math.min(everyCount, everyCount - remaining));
  const cells = Array.from({ length: everyCount }, (_, i) => i < done);

  return (
    <div>
      <p className="text-sm font-semibold text-stone-800">
        {remaining > 0 ? (
          <>
            Le faltan <span className="text-gold-dark">{remaining}</span> servicio{remaining === 1 ? '' : 's'}{' '}
            para su próxima recompensa ({label})
          </>
        ) : (
          <>¡Ya completaste este ciclo! Tu premio está en camino.</>
        )}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="img" aria-label={`${done} de ${everyCount} servicios`}>
        {cells.map((filled, i) => (
          <span
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
              filled
                ? 'border-gold bg-gold text-white'
                : 'border-stone-300 bg-white text-stone-400'
            }`}
          >
            {filled ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
