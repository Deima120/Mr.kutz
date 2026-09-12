/**
 * Fidelización — vista del cliente (`/loyalty`, mismo componente que ve el
 * admin, ramificado por rol como `AppointmentsPage.jsx`). Tres cosas:
 *  - Su avance hacia el próximo hito, con el indicador visual de progreso.
 *  - Premios ya otorgados pero sin elegir opción — puede elegir aquí mismo
 *    (o al agendar, ver `AppointmentForm.jsx`).
 *  - Premios ya elegidos, listos para aplicarse solos en su próximo cobro.
 *
 * Misma maqueta que `features/profile/pages/ProfilePage.jsx` (contenedor +
 * `ProfileCard`), no la de `AdminLayout` — el cliente no vive dentro del
 * panel con sidebar (`MainLayout.jsx` lo excluye explícitamente), así que
 * usar los componentes admin (`PageHeader`/`DataCard`) aquí se veía como una
 * maqueta aparte en vez de la misma experiencia que el resto de sus pantallas.
 */

import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import ProfileCard from '@/shared/components/admin/ProfileCard';
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
    <div className="min-h-[70vh] bg-stone-50">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-3xl animate-fade-in-up space-y-4">
          <div>
            <p className="section-label text-gold">Mi cuenta</p>
            <h1 className="break-words font-sans text-2xl font-bold tracking-tight text-stone-900">
              Fidelización
            </h1>
            <p className="mt-1 text-sm text-stone-500">Tu avance y tus premios por venir a la barbería.</p>
          </div>

          {loading ? (
            <ProfileCard title="Progreso" hint="Cargando">
              <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
            </ProfileCard>
          ) : (
            <>
              <ProfileCard title="Tu progreso" hint="Próximo hito">
                {progress?.nextMilestone ? (
                  <LoyaltyProgressTracker
                    everyCount={progress.nextMilestone.everyCount}
                    remaining={progress.nextMilestone.remaining}
                    label={progress.nextMilestone.label}
                    personal
                  />
                ) : (
                  <p className="text-sm text-stone-500">
                    Todavía no hay hitos de fidelización configurados. Vuelve pronto.
                  </p>
                )}
              </ProfileCard>

              {pendingChoice.map((reward) => (
                <ProfileCard key={reward.id} title="Elige tu premio" hint="Hito cumplido">
                  <LoyaltyRewardChoicePicker
                    reward={reward}
                    selectedOptionId={selections[reward.id]}
                    disabled={confirmingId === reward.id}
                    onSelect={(rewardId, optionId) =>
                      setSelections((prev) => ({ ...prev, [rewardId]: optionId }))
                    }
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="btn-dark disabled:opacity-60"
                      disabled={!selections[reward.id] || confirmingId === reward.id}
                      onClick={() => confirmChoice(reward.id)}
                    >
                      {confirmingId === reward.id ? 'Confirmando…' : 'Confirmar elección'}
                    </button>
                  </div>
                </ProfileCard>
              ))}

              <ProfileCard title="Tus premios" hint="Listos para canjear">
                {pendingRedeem.length > 0 ? (
                  <ul className="space-y-2.5">
                    {pendingRedeem.map((reward) => (
                      <li
                        key={reward.id}
                        className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5"
                      >
                        <Gift className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                        <p className="text-sm text-emerald-900">
                          <span className="font-semibold">
                            {reward.items.map((it) => it.description).join(' + ')}
                          </span>{' '}
                          — se aplica gratis en tu próximo cobro.
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 text-center">
                    <Gift className="mx-auto mb-2 h-10 w-10 text-stone-200" aria-hidden />
                    <p className="text-sm text-stone-500">
                      Todavía no tienes premios listos para canjear.
                    </p>
                  </div>
                )}
              </ProfileCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
