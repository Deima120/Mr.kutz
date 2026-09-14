import { Ban } from 'lucide-react';
import PaymentTypeBadge from '@/features/payments/components/PaymentTypeBadge';
import {
  formatPaymentAmount,
  formatPaymentDateTime,
  formatPaymentMethodName,
  formatPaymentMethodsSummary,
  getLineLabel,
  getPaymentChangeGiven,
  getPaymentClientName,
  getPaymentConcept,
  getPaymentLines,
  getPaymentMethodSplits,
  getPaymentTendered,
  isLineVoided,
  isMixedPaymentMethods,
  isPaymentVoided,
} from '@/features/payments/utils/paymentFormatters';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';

function DetailRow({ label, value, mono = false, full = false }) {
  if (value == null || value === '') return null;
  return (
    <div className={`min-w-0 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`text-sm text-stone-900 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

export default function PaymentDetailModal({
  payment,
  onClose,
  onVoidPayment,
  onVoidLine,
  loading = false,
}) {
  if (!payment) return null;

  const isVoided = isPaymentVoided(payment);
  const lines = getPaymentLines(payment);
  const methodSplits = getPaymentMethodSplits(payment);
  const mixedMethods = isMixedPaymentMethods(payment);
  const methodSummary = formatPaymentMethodsSummary(payment);
  const createdAt = payment.createdAt || payment.created_at;
  const voidedAt = payment.voidedAt || payment.voided_at;
  const voidReason = payment.voidReason || payment.void_reason;
  const tendered = getPaymentTendered(payment);
  const changeGiven = getPaymentChangeGiven(payment);

  return (
    <AdminModalShell
      open
      onClose={() => !loading && onClose()}
      title={`Venta #${payment.id}`}
      subtitle="Detalle y líneas"
      size="lg"
      preventClose={loading}
      closeOnBackdrop={!loading}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {!isVoided ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => onVoidPayment?.(payment)}
              className="btn-admin-outline text-sm inline-flex items-center gap-1.5 text-amber-800 border-amber-200"
            >
              <Ban className="h-3.5 w-3.5" /> Anular venta completa
            </button>
          ) : null}
          <button type="button" onClick={onClose} disabled={loading} className="btn-admin text-sm">
            Cerrar
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <PaymentTypeBadge payment={payment} />
        {mixedMethods ? (
          <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
            Pago mixto
          </span>
        ) : null}
        <span
          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
            isVoided
              ? 'border-stone-200 bg-stone-100 text-stone-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {isVoided ? 'Anulado' : 'Vigente'}
        </span>
        <span className="ml-auto font-serif text-xl font-medium text-gold tabular-nums">
          {formatPaymentAmount(payment.amount)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pb-3 border-b border-stone-100">
        <DetailRow label="Fecha" value={formatPaymentDateTime(createdAt, payment.start_time)} />
        <DetailRow label="Referencia" value={payment.reference} mono />
        {/* La fila de texto «Método» se quitó: repetía el bloque de métodos de abajo,
            importes incluidos (formatPaymentMethodsSummary ya los concatena). Solo se
            conserva como respaldo para cobros antiguos que no tienen methodSplits. */}
        {methodSplits.length === 0 ? (
          <DetailRow label="Método" value={methodSummary} />
        ) : null}
        <DetailRow label="Cliente" value={getPaymentClientName(payment)} />
        <DetailRow label="Concepto" value={getPaymentConcept(payment)} full />
        <DetailRow label="Notas" value={payment.notes} full />
        {tendered != null ? (
          <DetailRow label="Recibido (efectivo)" value={formatPaymentAmount(tendered)} />
        ) : null}
        {changeGiven != null ? (
          <DetailRow label="Vuelto" value={formatPaymentAmount(changeGiven)} />
        ) : null}
        {isVoided ? (
          <>
            <DetailRow label="Anulado el" value={voidedAt ? formatPaymentDateTime(voidedAt) : '—'} />
            <DetailRow label="Motivo anulación" value={voidReason} full />
          </>
        ) : null}
      </div>

      {methodSplits.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
            {methodSplits.length === 1 ? 'Método' : `Métodos (${methodSplits.length})`}
          </p>
          <div className="space-y-1">
            {methodSplits.map((split) => (
              <div
                key={split.id || `${split.paymentMethodId}-${split.amount}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-2.5 py-1.5"
              >
                <span className="text-sm text-stone-800">
                  {formatPaymentMethodName(
                    split.paymentMethodName || split.payment_method_name
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums text-stone-900">
                  {formatPaymentAmount(split.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {mixedMethods && !isVoided ? (
        <p className="mt-3 text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          Este cobro usa varios métodos. No se puede anular una línea suelta: anula la venta
          completa.
        </p>
      ) : null}

      <div className="mt-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
          Líneas ({lines.length})
        </p>
        {lines.length === 0 ? (
          <p className="text-sm text-stone-500">Sin líneas detalladas (registro legacy).</p>
        ) : (
          <div className="space-y-1.5">
            {lines.map((line) => {
              const voided = isLineVoided(line);
              const canVoidLine = !voided && !isVoided && !mixedMethods;
              const quantity = Number(line.quantity ?? 1);
              const unitPrice = line.unitPrice ?? line.unit_price;
              const lineAmount = line.lineAmount ?? line.line_amount;
              // El precio unitario solo aporta algo distinto de lo que ya muestra el
              // total de la línea cuando hay más de una unidad o el importe no es un
              // múltiplo simple del precio — para el caso típico (1 unidad, sin
              // descuento) repetía el mismo número dos veces.
              const showUnitPrice = quantity > 1 || Number(unitPrice) !== Number(lineAmount);
              return (
                <div
                  key={line.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 ${
                    voided ? 'border-stone-200 bg-stone-50 opacity-70' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase text-stone-500">
                        {line.lineType === 'service'
                          ? 'Servicio'
                          : line.lineType === 'product'
                            ? 'Producto'
                            : 'Caja'}
                      </span>
                      <p className={`text-sm font-medium text-stone-900 ${voided ? 'line-through' : ''}`}>
                        {getLineLabel(line)}
                      </p>
                      {voided ? (
                        <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-stone-200 text-stone-500">
                          Anulada
                        </span>
                      ) : null}
                    </div>
                    {showUnitPrice ? (
                      <p className="text-xs text-stone-500">
                        {formatPaymentAmount(unitPrice)}
                        {quantity > 1 ? ` × ${quantity}` : ''}
                      </p>
                    ) : null}
                    {voided && (line.voidReason || line.void_reason) ? (
                      <p className="text-[11px] text-amber-800">
                        Motivo: {line.voidReason || line.void_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${voided ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                      {formatPaymentAmount(lineAmount)}
                    </span>
                    {canVoidLine ? (
                      <AdminIconButton
                        icon={Ban}
                        label="Anular línea"
                        onClick={() => onVoidLine?.(payment, line)}
                        disabled={loading}
                        className="text-amber-700"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminModalShell>
  );
}
