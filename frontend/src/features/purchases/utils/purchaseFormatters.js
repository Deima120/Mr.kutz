import { formatMoney } from '@/shared/utils/money';
import { formatDisplayDateTime } from '@/shared/utils/formatDisplayDate';

/** @deprecated Preferir formatMoney — se mantiene como alias de dominio. */
export function formatPurchaseAmount(n) {
  return formatMoney(n);
}

export function formatPurchaseDate(d) {
  return formatDisplayDateTime(d);
}
