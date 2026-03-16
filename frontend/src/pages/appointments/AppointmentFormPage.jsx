/**
 * Formulario para crear nueva cita
 * Vista cliente: diseño premium y pasos claros. Admin/Barber: formulario estándar.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import * as clientService from '../../services/clientService';
import * as barberService from '../../services/barberService';
import * as serviceService from '../../services/serviceService';

const inputClass = 'w-full px-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors outline-none';
const labelClass = 'block text-sm font-semibold text-stone-700 mb-1.5';

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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    const promises = [
      barberService.getBarbers(),
      serviceService.getServices(),
    ];
    if (!isClient) promises.unshift(clientService.getClients());
    Promise.all(promises)
      .then((results) => {
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
      })
      .catch(() => {
        setBarbers([]);
        setServices([]);
      })
      .finally(() => setDataLoaded(true));
  }, [isClient]);

  useEffect(() => {
    if (isClient && user?.clientId) {
      setFormData((prev) => ({ ...prev, clientId: String(user.clientId) }));
    }
  }, [isClient, user?.clientId]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, startTime: '' }));
    if (formData.barberId && formData.appointmentDate) {
      setSlotsLoading(true);
      appointmentService
        .getAvailableSlots(formData.barberId, formData.appointmentDate)
        .then((slots) => setSlots(Array.isArray(slots) ? slots : []))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
      setSlotsLoading(false);
    }
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
      navigate('/appointments', { replace: true, state: { appointmentCreated: true } });
    } catch (err) {
      setError(err?.message || 'Error al crear cita');
    } finally {
      setLoading(false);
    }
  };

  // ——— Vista cliente: diseño premium, pasos claros ———
  if (isClient) {
    return (
      <div className="min-h-[60vh] bg-stone-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-xl mx-auto">
            <Link
              to="/appointments"
              className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm font-medium mb-6"
            >
              <span aria-hidden>←</span>
              Volver a mis citas
            </Link>
            <p className="section-label text-gold">Reserva</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight mb-2">
              Agendar cita
            </h1>
            <p className="text-stone-500 mb-8">
              Elige barbero, servicio, fecha y hora. En pocos pasos quedas listo.
            </p>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
              <div className="p-6 sm:p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm" role="alert">
                    {error}
                  </div>
                )}

                {dataLoaded && barbers.length === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm" role="status">
                    <p className="font-medium mb-1">No hay barberos disponibles</p>
                    <p className="text-amber-700">En este momento no podemos mostrar opciones para agendar. Por favor, contacta con la barbería o intenta más tarde.</p>
                  </div>
                )}

                {dataLoaded && services.length === 0 && barbers.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm" role="status">
                    <p className="font-medium mb-1">No hay servicios disponibles</p>
                    <p className="text-amber-700">No hay servicios cargados para elegir. Contacta con la barbería.</p>
                  </div>
                )}

                <section>
                  <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">Paso 1 — Barbero y servicio</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="barberId" className={labelClass}>Barbero *</label>
                      <select id="barberId" name="barberId" value={formData.barberId} onChange={handleChange} className={inputClass} required disabled={!dataLoaded || barbers.length === 0}>
                        <option value="">
                          {!dataLoaded ? 'Cargando...' : barbers.length === 0 ? 'No hay barberos disponibles' : 'Seleccionar barbero...'}
                        </option>
                        {barbers.map((b) => (
                          <option key={b.id} value={b.id}>{b.first_name} {b.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="serviceId" className={labelClass}>Servicio *</label>
                      <select id="serviceId" name="serviceId" value={formData.serviceId} onChange={handleChange} className={inputClass} required disabled={!dataLoaded || services.length === 0}>
                        <option value="">
                          {!dataLoaded ? 'Cargando...' : services.length === 0 ? 'No hay servicios disponibles' : 'Seleccionar servicio...'}
                        </option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — ${s.price} ({s.duration_minutes} min)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">Paso 2 — Fecha y hora</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="appointmentDate" className={labelClass}>Fecha *</label>
                      <input
                        id="appointmentDate"
                        name="appointmentDate"
                        type="date"
                        value={formData.appointmentDate}
                        onChange={handleChange}
                        min={new Date().toISOString().slice(0, 10)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="startTime" className={labelClass}>Hora *</label>
                      <select
                        id="startTime"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className={inputClass}
                        required
                        disabled={!formData.barberId || !formData.appointmentDate || slotsLoading}
                      >
                        <option value="">
                          {!formData.barberId || !formData.appointmentDate
                            ? 'Elige primero barbero y fecha'
                            : slotsLoading
                            ? 'Cargando horarios...'
                            : slots.length === 0
                            ? 'Sin horarios para esta fecha'
                            : 'Seleccionar hora...'}
                        </option>
                        {slots.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">Opcional</h2>
                  <label htmlFor="notes" className={labelClass}>Notas (ej. preferencia de corte)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className={inputClass + ' resize-none'}
                    placeholder="Algo que quieras que sepamos..."
                  />
                </section>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Link
                    to="/appointments"
                    className="inline-flex justify-center px-6 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || !dataLoaded || barbers.length === 0 || services.length === 0}
                    className="inline-flex justify-center px-6 py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Reservando...' : 'Confirmar reserva'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ——— Vista admin / barber ———
  return (
    <div className="space-y-8">
      <div>
        <p className="section-label text-gold">Citas</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          Nueva cita
        </h1>
        <p className="text-stone-500 mt-1">Asigna cliente, barbero, servicio, fecha y hora.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden max-w-xl">
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className={labelClass}>Cliente *</label>
            <select name="clientId" value={formData.clientId} onChange={handleChange} className={inputClass} required>
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Barbero *</label>
            <select name="barberId" value={formData.barberId} onChange={handleChange} className={inputClass} required>
              <option value="">Seleccionar barbero...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.first_name} {b.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Servicio *</label>
            <select name="serviceId" value={formData.serviceId} onChange={handleChange} className={inputClass} required>
              <option value="">Seleccionar servicio...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha *</label>
              <input name="appointmentDate" type="date" value={formData.appointmentDate} onChange={handleChange} min={new Date().toISOString().slice(0, 10)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Hora *</label>
              <select name="startTime" value={formData.startTime} onChange={handleChange} className={inputClass} required disabled={slotsLoading}>
                <option value="">
                  {slotsLoading ? 'Cargando...' : formData.barberId && formData.appointmentDate && slots.length === 0 ? 'Sin horarios' : 'Seleccionar...'}
                </option>
                {slots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className={inputClass + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50">
              {loading ? 'Creando...' : 'Crear cita'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
