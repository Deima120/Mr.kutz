/**
 * Aviso para el cliente en "Mis citas" — su pantalla de entrada — sobre su
 * fidelización. Dos casos, ambos posibles a la vez:
 *  - `pendingRedeem`: ya eligió premio, se aplica solo en su próximo cobro.
 *  - `pendingChoice`: ganó un hito con varias opciones y todavía no eligió —
 *    lo manda a "Fidelización" a elegir (o puede hacerlo al agendar).
 * Desaparece solo cuando ya no hay nada pendiente, sin que haga falta
 * marcarlo como "leído".
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Sparkles } from 'lucide-react';
import * as clientService from '@/features/clients/services/clientService';

export default function ClientLoyaltyBanner() {
  const [pendingRedeem, setPendingRedeem] = useState([]);
  const [pendingChoice, setPendingChoice] = useState([]);

  useEffect(() => {
    let cancelled = false;
    clientService
      .getMyLoyalty()
      .then((data) => {
        if (cancelled) return;
        setPendingRedeem(data.pendingRedeem);
        setPendingChoice(data.pendingChoice);
      })
      .catch(() => {
        // Si falla, simplemente no se muestra el aviso — no es motivo para
        // romper la pantalla de citas.
        if (!cancelled) {
          setPendingRedeem([]);
          setPendingChoice([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (pendingRedeem.length === 0 && pendingChoice.length === 0) return null;

  const descripciones = pendingRedeem.flatMap((r) => r.items.map((it) => it.description));

  return (
    <div className="shrink-0 mb-3 flex flex-col gap-2">
      {pendingRedeem.length > 0 ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <Gift className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">
                ¡Ganaste {descripciones.length > 1 ? 'unos premios' : 'un premio'} por tu fidelidad!
              </p>
              <p className="mt-0.5 text-emerald-800">
                {descripciones.join(' · ')} — se aplica solo, gratis, la próxima vez que te cobren un
                servicio.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {pendingChoice.length > 0 ? (
        <div
          className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-barber-dark"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-gold-dark" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">¡Cumpliste un hito de fidelización!</p>
              <p className="mt-0.5">
                Elige tu premio en{' '}
                <Link to="/loyalty" className="underline hover:text-gold-dark">
                  Fidelización
                </Link>{' '}
                o al agendar tu próxima cita.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
