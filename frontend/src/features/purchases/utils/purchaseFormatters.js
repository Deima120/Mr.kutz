export function formatPurchaseAmount(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPurchaseDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPurchaseStatusLabel(purchase) {
  return purchase?.voided_at ? 'Anulada' : 'Activa';
}
