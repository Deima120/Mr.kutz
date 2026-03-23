/**
 * Formulario para registrar pago
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as paymentService from '../../services/paymentService';
import * as appointmentService from '../../services/appointmentService';

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
    const id = e.target.value;
    const apt = completedAppointments.find((a) => a.id === parseInt(id, 10));
    setFormData((prev) => ({
      ...prev,
      appointmentId: id || '',
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
        appointmentId: formData.appointmentId
          ? parseInt(formData.appointmentId, 10)
          : undefined,
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
    <div className="max-w-xl page-shell">
      <div>
        <p className="section-label text-gold mb-1">Finanzas</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          Registrar pago
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel-card overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={linkToAppointment}
            onChange={(e) => setLinkToAppointment(e.target.checked)}
            className="rounded border-stone-300"
          />
          <span className="text-sm text-stone-700">Vincular a cita completada</span>
        </label>

        {linkToAppointment && completedAppointments.length > 0 && (
          <div>
            <label className="label-premium">
              Cita
            </label>
            <select
              name="appointmentId"
              value={formData.appointmentId}
              onChange={handleAppointmentSelect}
              className="input-premium"
            >
              <option value="">Seleccionar cita...</option>
              {completedAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.client_first_name} {a.client_last_name} - {a.service_name} - $
                  {a.price ?? a.service_price ?? 0} - {String(a.appointment_date).slice(0, 10)} {String(a.start_time).slice(0, 5)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label-premium">
            Monto ($) *
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={handleChange}
            className="input-premium"
            required
          />
        </div>

        <div>
          <label className="label-premium">
            Método de pago *
          </label>
          <select
            name="paymentMethodId"
            value={formData.paymentMethodId}
            onChange={handleChange}
            className="input-premium"
            required
          >
            <option value="">Seleccionar...</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-premium">
            Referencia
          </label>
          <input
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            placeholder="Nº operación, folio..."
            className="input-premium"
          />
        </div>

        <div>
          <label className="label-premium">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="input-premium resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-admin disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar pago'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-admin-outline"
          >
            Cancelar
          </button>
        </div>
        </div>
      </form>
    </div>
  );
}
