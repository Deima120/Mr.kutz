import { useEffect, useState } from 'react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import { formatMoneyInputDigits, parseMoneyInput } from '@/shared/utils/money';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import * as cashRegisterService from '@/features/cash-registers/services/cashRegisterService';

export default function OpenCashRegisterModal({ open, onClose, onOpened }) {
  const [openingAmount, setOpeningAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setOpeningAmount('');
    setNotes('');
    setError('');
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseMoneyInput(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Indica un monto base de apertura válido (≥ 0).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const register = await cashRegisterService.open({
        openingAmount: amount,
        notes: notes.trim() || undefined,
      });
      onOpened?.(register);
      onClose?.();
    } catch (err) {
      const dateHint =
        err?.reason === 'CASH_REGISTER_ALREADY_OPEN' && err?.details?.businessDate
          ? ` (caja del ${err.details.businessDate})`
          : '';
      setError(`${getApiErrorMessage(err, 'No se pudo abrir la caja')}${dateHint}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalShell
      open={open}
      onClose={() => !submitting && onClose?.()}
      title="Abrir caja"
      subtitle="Monto base en efectivo al iniciar el día"
      size="sm"
      preventClose={submitting}
      closeOnBackdrop={!submitting}
      footer={
        <div className="flex gap-2 w-full">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-semibold rounded-xl text-sm border border-stone-200/80"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="open-cash-register-form"
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm"
          >
            {submitting ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </div>
      }
    >
      <form id="open-cash-register-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error ? (
          <AppInlineAlert variant="error" className="text-xs py-2 px-3">
            {error}
          </AppInlineAlert>
        ) : null}
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Monto base (efectivo) *
          </label>
          <input
            type="text"
            inputMode="numeric"
            data-autofocus
            value={openingAmount}
            onChange={(e) => setOpeningAmount(formatMoneyInputDigits(e.target.value))}
            placeholder="0"
            className="input-premium"
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
          />
        </div>
      </form>
    </AdminModalShell>
  );
}
