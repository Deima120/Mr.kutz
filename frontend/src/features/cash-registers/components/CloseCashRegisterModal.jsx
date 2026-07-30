import { useEffect, useState } from 'react';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
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

  useEffect(() => {
    if (!open || !register?.id) return undefined;
    setCountedCash('');
    setNotes('');
    setError('');
    setUnpaid([]);
    setSubmitting(false);
    setPreview(null);
    let cancelled = false;
    cashRegisterService
      .getSummary(register.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
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
  const staleNote = register.isStaleOpen
    ? register.staleWarning || `Caja del ${register.businessDate} aún abierta.`
    : null;

  return (
    <AdminConfirmModal
      open={open}
      variant="warning"
      size="md"
      title="¿Cerrar caja?"
      description={
        <>
          Día <strong className="text-stone-800">{register.businessDate}</strong>
          {Number.isFinite(expectedCash) ? (
            <>
              . Efectivo esperado:{' '}
              <strong className="text-stone-800">{formatMoney(expectedCash)}</strong>
            </>
          ) : (
            '.'
          )}{' '}
          Tras el cierre no se podrán registrar cobros hasta abrir una nueva.
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
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Efectivo contado (opcional)
          </label>
          <input
            type="text"
            inputMode="numeric"
            data-autofocus
            value={countedCash}
            onChange={(e) => setCountedCash(formatMoneyInputDigits(e.target.value))}
            placeholder={Number.isFinite(expectedCash) ? formatMoney(expectedCash).replace(/^\$/, '') : '0'}
            className="input-premium"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Notas</label>
          <textarea
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
