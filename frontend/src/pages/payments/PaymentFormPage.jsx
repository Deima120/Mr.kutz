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
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Registrar pago
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow border p-6 space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={linkToAppointment}
            onChange={(e) => setLinkToAppointment(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Vincular a cita completada</span>
        </label>

        {linkToAppointment && completedAppointments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cita
            </label>
            <select
              name="appointmentId"
              value={formData.appointmentId}
              onChange={handleAppointmentSelect}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto ($) *
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago *
          </label>
          <select
            name="paymentMethodId"
            value={formData.paymentMethodId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Referencia
          </label>
          <input
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            placeholder="Nº operación, folio..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar pago'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
