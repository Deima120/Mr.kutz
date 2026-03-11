/**
 * Formulario para crear nueva cita
 * Admin/Barber: eligen cliente. Cliente: se asigna automáticamente.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import * as clientService from '../../services/clientService';
import * as barberService from '../../services/barberService';
import * as serviceService from '../../services/serviceService';

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  const [clients, setClients] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [formData, setFormData] = useState({
    clientId: isClient ? String(user?.clientId ?? '') : '',
    barberId: '',
    serviceId: '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const promises = [
      barberService.getBarbers(),
      serviceService.getServices(),
    ];
    if (!isClient) promises.unshift(clientService.getClients());
    Promise.all(promises).then((results) => {
      if (!isClient) {
        const [c, b, s] = results;
        setClients(c?.clients || c || []);
        setBarbers(Array.isArray(b) ? b : []);
        setServices(Array.isArray(s) ? s : []);
      } else {
        const [b, s] = results;
        setBarbers(Array.isArray(b) ? b : []);
        setServices(Array.isArray(s) ? s : []);
      }
    });
  }, [isClient]);

  useEffect(() => {
    if (isClient && user?.clientId) {
      setFormData((prev) => ({ ...prev, clientId: String(user.clientId) }));
    }
  }, [isClient, user?.clientId]);

  useEffect(() => {
    if (formData.barberId && formData.appointmentDate) {
      appointmentService
        .getAvailableSlots(formData.barberId, formData.appointmentDate)
        .then((slots) => setSlots(Array.isArray(slots) ? slots : []))
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
    }
    setFormData((prev) => ({ ...prev, startTime: '' }));
  }, [formData.barberId, formData.appointmentDate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        barberId: parseInt(formData.barberId, 10),
        serviceId: parseInt(formData.serviceId, 10),
        appointmentDate: formData.appointmentDate,
        startTime: formData.startTime || undefined,
        notes: formData.notes || undefined,
      };
      if (!isClient) payload.clientId = parseInt(formData.clientId, 10);
      else if (user?.clientId) payload.clientId = user.clientId;
      await appointmentService.createAppointment(payload);
      navigate('/appointments', { replace: true });
    } catch (err) {
      setError(err?.message || 'Error al crear cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        {isClient ? 'Agendar cita' : 'Nueva cita'}
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

        {!isClient && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              required
            >
              <option value="">Seleccionar...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barbero *
          </label>
          <select
            name="barberId"
            value={formData.barberId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">Seleccionar...</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.first_name} {b.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Servicio *
          </label>
          <select
            name="serviceId"
            value={formData.serviceId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">Seleccionar...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - ${s.price} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              name="appointmentDate"
              type="date"
              value={formData.appointmentDate}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora *
            </label>
            <select
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              required
            >
              <option value="">Seleccionar...</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
              {formData.barberId && formData.appointmentDate && slots.length === 0 && (
                <option value="" disabled>
                  Sin horarios disponibles
                </option>
              )}
            </select>
          </div>
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
            {loading ? 'Creando...' : 'Crear cita'}
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
