import { useEffect, useState } from 'react';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import CashMethodBreakdownList from '@/features/cash-registers/components/CashMethodBreakdownList';
import { resolveCashCloseDifference } from '@/features/cash-registers/utils/cashCloseDifference';
import { formatMoney, formatMoneyInputDigits, parseMoneyInput } from '@/shared/utils/money';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import * as cashRegisterService from '@/features/cash-registers/services/cashRegisterService';

export default function CloseCashRegisterModal({ open, register, onClose, onClosed }) {
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [unpaid, setUnpaid] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open || !register?.id) return undefined;
    setCountedCash('');
    setNotes('');
    setError('');
    setUnpaid([]);
    setSubmitting(false);
    setPreview(null);
    setPreviewLoading(true);
    let cancelled = false;
    cashRegisterService
      .getSummary(register.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, register?.id]);

  if (!open || !register) return null;

  const handleConfirm = async () => {
    let counted;
    if (String(countedCash).trim() !== '') {
      counted = parseMoneyInput(countedCash);
      if (!Number.isFinite(counted) || counted < 0) {
        setError('El efectivo contado debe ser un monto ≥ 0.');
        return;
      }
    }
    setSubmitting(true);
    setError('');
    setUnpaid([]);
    try {
      const body = { notes: notes.trim() || undefined };
      if (counted != null) body.countedCash = counted;
      const summary = await cashRegisterService.close(body);
      onClosed?.(summary);
      onClose?.();
    } catch (err) {
      if (err?.reason === 'UNPAID_COMPLETED_APPOINTMENTS') {
        setUnpaid(Array.isArray(err.details?.unpaidAppointments) ? err.details.unpaidAppointments : []);
      }
      setError(getApiErrorMessage(err, 'No se pudo cerrar la caja'));
    } finally {
      setSubmitting(false);
    }
  };

  const expectedCash = preview?.expectedCash;
  const totalAmount = preview?.totalAmount;
  const paymentCount = preview?.paymentCount ?? 0;
  const byMethod = preview?.byMethod ?? preview?.sections?.sales?.byMethod ?? [];
  const diff = resolveCashCloseDifference(expectedCash, countedCash);

  const staleNote = register.isStaleOpen
    ? register.staleWarning || `Caja del ${register.businessDate} aún abierta.`
    : null;

  return (
    <AdminConfirmModal
      open={open}
      variant="warning"
      size="lg"
      title="¿Cerrar caja?"
      description={
        <>
          Día <strong className="text-stone-800">{register.businessDate}</strong>. Tras el cierre no se
          podrán registrar cobros hasta abrir una nueva.
        </>
      }
      confirmLabel="Cerrar caja"
      submittingLabel="Cerrando…"
      isSubmitting={submitting}
      autoFocusConfirm={false}
      onCancel={onClose}
      onConfirm={handleConfirm}
    >
      <div className="space-y-3">
        {staleNote ? (
          <AppInlineAlert variant="error" title="Caja de día anterior" className="text-xs py-2 px-3">
            {staleNote}
          </AppInlineAlert>
        ) : null}
        {error ? (
          <AppInlineAlert variant="error" className="text-xs py-2 px-3">
            {error}
          </AppInlineAlert>
        ) : null}
        {unpaid.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            <p className="font-semibold mb-1">Citas completadas sin cobro</p>
            <ul className="list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
              {unpaid.map((a) => (
                <li key={a.id}>
                  #{a.id} · {a.clientName} · {a.serviceName}
                  {a.startTime ? ` · ${a.startTime}` : ''}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 opacity-90">Cobra o resuelve esas citas antes de cerrar.</p>
          </div>
        ) : null}

        {previewLoading ? (
          <p className="text-sm text-stone-500">Cargando resumen…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Cobrado
                </p>
                <p className="font-serif text-lg font-medium text-stone-900 tabular-nums mt-0.5">
                  {Number.isFinite(totalAmount) ? formatMoney(totalAmount) : '—'}
                </p>
                <p className="text-[11px] text-stone-500">
                  {paymentCount} cobro{paymentCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Esperado
                </p>
                <p className="font-serif text-lg font-medium text-gold tabular-nums mt-0.5">
                  {Number.isFinite(expectedCash) ? formatMoney(expectedCash) : '—'}
                </p>
                <p className="text-[11px] text-stone-500">Efectivo en caja</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Base
                </p>
                <p className="font-serif text-lg font-medium text-stone-900 tabular-nums mt-0.5">
                  {formatMoney(register.openingAmount)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-stone-600 mb-1.5">Por método de pago</p>
              <CashMethodBreakdownList
                byMethod={byMethod}
                emptyText="Sin cobros en esta caja."
              />
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="close-cash-counted"
            className="block text-[11px] font-semibold text-stone-600 mb-1"
          >
            Efectivo contado (opcional)
          </label>
          <input
            id="close-cash-counted"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            data-autofocus
            value={countedCash}
            onChange={(e) => setCountedCash(formatMoneyInputDigits(e.target.value))}
            placeholder={
              Number.isFinite(expectedCash) ? formatMoney(expectedCash).replace(/^\$/, '') : '0'
            }
            className="input-premium"
            disabled={submitting}
          />
          {diff.kind !== 'empty' ? (
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 ${diff.toneClass}`}
              role="status"
            >
              <span>
                {diff.label}
                {diff.kind !== 'match' && Number.isFinite(diff.difference)
                  ? `: ${formatMoney(Math.abs(diff.difference))}`
                  : ''}
              </span>
              <span className="tabular-nums opacity-90">
                Contado {formatMoney(diff.counted)} · Esperado{' '}
                {Number.isFinite(expectedCash) ? formatMoney(expectedCash) : '—'}
              </span>
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] text-stone-500">
              Si ingresas el contado, verás al instante si cuadra, sobra o falta.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="close-cash-notes"
            className="block text-[11px] font-semibold text-stone-600 mb-1"
          >
            Notas
          </label>
          <textarea
            id="close-cash-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
            placeholder="Opcional"
            className="input-premium resize-none"
            disabled={submitting}
          />
        </div>
      </div>
    </AdminConfirmModal>
  );
}
