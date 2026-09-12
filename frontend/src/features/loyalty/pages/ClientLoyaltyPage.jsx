/**
 * Fidelización — vista del cliente (`/loyalty`, mismo componente que ve el
 * admin, ramificado por rol como `AppointmentsPage.jsx`). Tres cosas:
 *  - Su avance hacia el próximo hito, con el indicador visual de progreso.
 *  - Premios ya otorgados pero sin elegir opción — puede elegir aquí mismo
 *    (o al agendar, ver `AppointmentForm.jsx`).
 *  - Premios ya elegidos, listos para aplicarse solos en su próximo cobro.
 */

import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import * as clientService from '@/features/clients/services/clientService';
import LoyaltyProgressTracker from '@/features/loyalty/components/LoyaltyProgressTracker';
import LoyaltyRewardChoicePicker from '@/features/loyalty/components/LoyaltyRewardChoicePicker';

export default function ClientLoyaltyPage() {
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [pendingRedeem, setPendingRedeem] = useState([]);
  const [pendingChoice, setPendingChoice] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selections, setSelections] = useState({}); // { [rewardId]: optionId }
  const [confirmingId, setConfirmingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientService.getMyLoyalty();
      setPendingRedeem(data.pendingRedeem);
      setPendingChoice(data.pendingChoice);
      setProgress(data.progress);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar tu fidelización.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmChoice = async (rewardId) => {
    const optionId = selections[rewardId];
    if (!optionId) return;
    setConfirmingId(rewardId);
    try {
      await clientService.chooseMyLoyaltyOption(rewardId, optionId);
      toast.success('¡Premio elegido! Se aplicará solo en tu próximo cobro.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo elegir el premio.'));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Fidelización" subtitle="Tu avance y tus premios por venir a la barbería" />

      {loading ? (
        <DataCard compact>
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        </DataCard>
      ) : (
        <div className="space-y-3">
          {progress?.nextMilestone ? (
            <DataCard compact>
              <LoyaltyProgressTracker
                everyCount={progress.nextMilestone.everyCount}
                remaining={progress.nextMilestone.remaining}
                label={progress.nextMilestone.label}
                personal
              />
            </DataCard>
          ) : (
            <DataCard compact>
              <p className="text-sm text-stone-500">
                Todavía no hay hitos de fidelización configurados. Vuelve pronto.
              </p>
            </DataCard>
          )}

          {pendingChoice.map((reward) => (
            <DataCard key={reward.id} compact>
              <LoyaltyRewardChoicePicker
                reward={reward}
                selectedOptionId={selections[reward.id]}
                disabled={confirmingId === reward.id}
                onSelect={(rewardId, optionId) =>
                  setSelections((prev) => ({ ...prev, [rewardId]: optionId }))
                }
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="btn-admin text-xs py-1.5"
                  disabled={!selections[reward.id] || confirmingId === reward.id}
                  onClick={() => confirmChoice(reward.id)}
                >
                  {confirmingId === reward.id ? 'Confirmando…' : 'Confirmar elección'}
                </button>
              </div>
            </DataCard>
          ))}

          {pendingRedeem.length > 0 ? (
            <DataCard compact>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                <Gift className="h-4 w-4" aria-hidden /> Listo para tu próxima visita
              </p>
              <ul className="space-y-1.5">
                {pendingRedeem.map((reward) => (
                  <li key={reward.id} className="text-xs text-stone-600">
                    {reward.items.map((it) => it.description).join(' + ')} — se aplica gratis en tu
                    próximo cobro.
                  </li>
                ))}
              </ul>
            </DataCard>
          ) : null}
        </div>
      )}
    </div>
  );
}
