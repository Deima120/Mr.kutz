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

function DetailRow({ label, value, mono = false }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-stone-100 last:border-0">
      <span className="text-[11px] font-semibold text-stone-500 shrink-0">{label}</span>
      <span className={`text-sm text-stone-900 text-right break-words ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
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
      size="xl"
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
      <div className="flex flex-wrap items-center gap-2 mb-4">
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

      <DetailRow label="Fecha" value={formatPaymentDateTime(createdAt, payment.start_time)} />
      <DetailRow label="Referencia" value={payment.reference} mono />
      {/* La fila de texto «Método» se quitó: repetía el bloque de métodos de abajo,
          importes incluidos (formatPaymentMethodsSummary ya los concatena). Solo se
          conserva como respaldo para cobros antiguos que no tienen methodSplits. */}
      {methodSplits.length === 0 ? (
        <DetailRow label="Método" value={methodSummary} />
      ) : null}
      <DetailRow label="Cliente" value={getPaymentClientName(payment)} />
      <DetailRow label="Concepto" value={getPaymentConcept(payment)} />
      <DetailRow label="Notas" value={payment.notes} />
      {tendered != null ? (
        <DetailRow label="Recibido (efectivo)" value={formatPaymentAmount(tendered)} />
      ) : null}
      {changeGiven != null ? (
        <DetailRow label="Vuelto" value={formatPaymentAmount(changeGiven)} />
      ) : null}
      {isVoided ? (
        <>
          <DetailRow label="Anulado el" value={voidedAt ? formatPaymentDateTime(voidedAt) : '—'} />
          <DetailRow label="Motivo anulación" value={voidReason} />
        </>
      ) : null}

      {methodSplits.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2">
            {methodSplits.length === 1 ? 'Método' : `Métodos (${methodSplits.length})`}
          </p>
          <div className="space-y-1.5">
            {methodSplits.map((split) => (
              <div
                key={split.id || `${split.paymentMethodId}-${split.amount}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2"
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
        <p className="mt-4 text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          Este cobro usa varios métodos. No se puede anular una línea suelta: anula la venta
          completa.
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2">
          Líneas ({lines.length})
        </p>
        {lines.length === 0 ? (
          <p className="text-sm text-stone-500">Sin líneas detalladas (registro legacy).</p>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => {
              const voided = isLineVoided(line);
              const canVoidLine = !voided && !isVoided && !mixedMethods;
              return (
                <div
                  key={line.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    voided ? 'border-stone-200 bg-stone-50 opacity-70' : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase text-stone-500">
                        {line.lineType === 'service'
                          ? 'Servicio'
                          : line.lineType === 'product'
                            ? 'Producto'
                            : 'Caja'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold rounded px-1.5 py-0.5 border ${
                          voided
                            ? 'border-stone-200 text-stone-500'
                            : 'border-emerald-200 text-emerald-800 bg-emerald-50'
                        }`}
                      >
                        {voided ? 'Anulada' : 'Activa'}
                      </span>
                    </div>
                    <p className={`text-sm font-medium text-stone-900 ${voided ? 'line-through' : ''}`}>
                      {getLineLabel(line)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatPaymentAmount(line.unitPrice ?? line.unit_price)}
                      {line.lineType === 'product' ? ` × ${line.quantity}` : ''}
                    </p>
                    {voided && (line.voidReason || line.void_reason) ? (
                      <p className="text-[11px] text-amber-800 mt-1">
                        Motivo: {line.voidReason || line.void_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${voided ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                      {formatPaymentAmount(line.lineAmount ?? line.line_amount)}
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
