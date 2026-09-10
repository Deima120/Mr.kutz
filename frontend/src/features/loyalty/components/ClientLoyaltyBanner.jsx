/**
 * Aviso para el cliente: "ya ganaste un premio de fidelización". Hasta ahora
 * esto solo lo veía el mostrador (ficha del cliente, Fidelización); el cliente
 * se enteraba de casualidad al ver la línea gratis en su recibo. Se muestra en
 * "Mis citas" — su pantalla de entrada — y desaparece sola cuando se canjea
 * (deja de estar pendiente), sin que haga falta marcarlo como "leído".
 */

import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import * as clientService from '@/features/clients/services/clientService';

export default function ClientLoyaltyBanner() {
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    let cancelled = false;
    clientService
      .getMyLoyalty()
      .then((data) => {
        if (!cancelled) setRewards(data);
      })
      .catch(() => {
        // Si falla, simplemente no se muestra el aviso — no es motivo para
        // romper la pantalla de citas.
        if (!cancelled) setRewards([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rewards.length === 0) return null;

  const descripciones = rewards.flatMap((r) => r.items.map((it) => it.description));

  return (
    <div
      className="shrink-0 mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Gift className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">
            ¡Ganaste {descripciones.length > 1 ? 'unos premios' : 'un premio'} por tu fidelidad!
          </p>
          <p className="mt-0.5 text-emerald-800">
            {descripciones.join(' · ')} — se aplica solo, gratis, la próxima vez que te cobren un servicio.
          </p>
        </div>
      </div>
    </div>
  );
}
