/**
 * Lista de opciones de premio para UN hito ya otorgado y aún sin elegir —
 * componente de presentación puro (no llama a la API): quien lo usa decide
 * qué hacer con la elección.
 *
 * Dos usos reales: dentro de `AppointmentForm.jsx` (la elección se manda junto
 * con la cita al agendar) y en la pantalla de Fidelización del cliente /
 * respaldo del admin (la elección se confirma de inmediato contra la API).
 */

import { Gift } from 'lucide-react';

/**
 * @param {{
 *   reward: { id: number, ruleLabel: string, options: Array<{ id: number, items: Array<{ description: string }> }> },
 *   selectedOptionId: number | string | null,
 *   onSelect: (rewardId: number, optionId: number) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function LoyaltyRewardChoicePicker({ reward, selectedOptionId, onSelect, disabled = false }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-barber-dark">
        <Gift className="h-4 w-4 text-gold-dark" aria-hidden />
        Elige tu premio — {reward.ruleLabel}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {reward.options.map((option) => {
          const checked = String(selectedOptionId) === String(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                checked
                  ? 'border-gold bg-white shadow-sm'
                  : 'border-stone-200 bg-white/60 hover:border-gold/50'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name={`loyalty-reward-${reward.id}`}
                className="mt-0.5"
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(reward.id, option.id)}
              />
              <span className="text-stone-700">
                {option.items.map((it) => it.description).join(' + ')}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
