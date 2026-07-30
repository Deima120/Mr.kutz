import { resolveCashRegisterStatusBadge } from '@/features/cash-registers/utils/cashRegisterStatusBadge';

export { resolveCashRegisterStatusBadge };

export default function CashRegisterStatusBadge({ register }) {
  const badge = resolveCashRegisterStatusBadge(register);
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
