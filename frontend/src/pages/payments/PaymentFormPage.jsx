/**
 * Formulario para registrar pago
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as paymentService from '../../services/paymentService';
import * as appointmentService from '../../services/appointmentService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

export default function PaymentFormPage() {
  const navigate = useNavigate();
  const [methods, setMethods] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethodId: '',
    appointmentId: '',
    reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkToAppointment, setLinkToAppointment] = useState(true);

  useEffect(() => {
    paymentService.getPaymentMethods().then((m) => {
      setMethods(Array.isArray(m) ? m : []);
    });
  }, []);

  useEffect(() => {
    if (linkToAppointment) {
      appointmentService
        .getAppointments({ status: 'completed', limit: 50 })
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setCompletedAppointments(list);
        })
        .catch(() => setCompletedAppointments([]));
    } else {
      setCompletedAppointments([]);
      setFormData((prev) => ({ ...prev, appointmentId: '' }));
    }
  }, [linkToAppointment]);

  const handleAppointmentSelect = (e) => {
    const idSel = e.target.value;
    const apt = completedAppointments.find((a) => a.id === parseInt(idSel, 10));
    setFormData((prev) => ({
      ...prev,
      appointmentId: idSel || '',
      amount: apt?.price ? String(apt.price) : prev.amount,
    }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await paymentService.createPayment({
        amount: parseFloat(formData.amount),
        paymentMethodId: parseInt(formData.paymentMethodId, 10),
        appointmentId: formData.appointmentId ? parseInt(formData.appointmentId, 10) : undefined,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      navigate('/payments', { replace: true });
    } catch (err) {
      setError(err?.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormShell
      backTo="/payments"
      backLabel="Pagos"
      modeBadge="Registro"
      aside={{
        kicker: 'Finanzas',
        title: 'Pagos alineados con citas',
        bullets: [
          'Vincular a una cita completada ayuda a cuadrar ingresos con el servicio.',
          'El método de pago queda registrado para reportes y auditoría.',
          'Referencia y notas son opcionales pero útiles en conciliación.',
        ],
        statusLabel: 'Flujo',
        statusValue: 'Caja / cobro',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader eyebrow="Pago" title="Registrar pago" />

          {error && <div className="alert-error text-sm py-2.5 shrink-0">{error}</div>}

          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={linkToAppointment}
              onChange={(e) => setLinkToAppointment(e.target.checked)}
              className="rounded border-stone-300 text-gold focus:ring-gold/40"
            />
            <span className="text-sm text-stone-700">Vincular a cita completada</span>
          </label>

          {linkToAppointment && completedAppointments.length > 0 && (
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Cita</label>
              <select
                name="appointmentId"
                value={formData.appointmentId}
                onChange={handleAppointmentSelect}
                className={ADMIN_FORM_FIELD_CLASS}
              >
                <option value="">Seleccionar cita…</option>
                {completedAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.client_first_name} {a.client_last_name} — {a.service_name} — $
                    {a.price ?? a.service_price ?? 0} — {String(a.appointment_date).slice(0, 10)}{' '}
                    {(() => {
                      const t = a.start_time;
                      if (!t) return '';
                      if (t instanceof Date) {
                        const hh = String(t.getHours()).padStart(2, '0');
                        const mm = String(t.getMinutes()).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }
                      const s = String(t);
                      const d = new Date(s);
                      if (!Number.isNaN(d.getTime()) && s.includes('T')) {
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }
                      const iso = s.match(/T(\d{1,2}):(\d{2})/);
                      if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
                      const any = s.match(/(\d{1,2}):(\d{2})/);
                      if (any) return `${String(any[1]).padStart(2, '0')}:${any[2]}`;
                      return s.slice(0, 5);
                    })()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Monto ($) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Método de pago *</label>
              <select
                name="paymentMethodId"
                value={formData.paymentMethodId}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              >
                <option value="">Seleccionar…</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Referencia</label>
            <input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="Nº operación, folio…"
              className={ADMIN_FORM_FIELD_CLASS}
            />
          </div>

          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Notas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none min-h-[3.25rem]`}
            />
          </div>

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton disabled={loading}>{loading ? 'Registrando…' : 'Registrar pago'}</AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
