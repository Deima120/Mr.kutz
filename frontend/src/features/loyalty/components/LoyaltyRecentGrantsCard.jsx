/**
 * Tarjeta del Dashboard: últimas recompensas de fidelización otorgadas.
 *
 * Decisión del propietario: el aviso de "se otorgó un beneficio" es dentro del
 * panel, no por correo. Siempre pide los últimos 5 (nunca la lista completa),
 * así que se renueva solo con cada hito nuevo sin necesidad de un estado de
 * "leído/no leído".
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import DashboardCard from '@/shared/components/admin/DashboardCard';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import * as loyaltyService from '@/features/loyalty/services/loyaltyService';

const RECENT_LIMIT = 5;

export default function LoyaltyRecentGrantsCard() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loyaltyService
      .getRewardsHistory({ limit: RECENT_LIMIT, offset: 0 })
      .then(({ rewards: data }) => {
        if (!cancelled) setRewards(data);
      })
      .catch(() => {
        if (!cancelled) setRewards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && rewards.length === 0) return null;

  return (
    <DashboardCard title="Fidelización — beneficios recientes" eyebrow="Últimos otorgados" eyebrowTone="gold">
      {loading ? (
        <p className="text-sm text-stone-500">Cargando…</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {rewards.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/clients/${r.client.id}`}
                    className="block truncate text-sm font-medium text-stone-800 hover:text-gold-dark"
                  >
                    {r.client.firstName} {r.client.lastName}
                  </Link>
                  <p className="truncate text-xs text-stone-500">{r.rule.label}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-stone-400 tabular-nums">
                {formatDisplayDate(r.grantedAt, { day: 'numeric', month: 'short' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
