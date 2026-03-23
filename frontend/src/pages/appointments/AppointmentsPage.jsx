/**
 * Listado y calendario de citas
 * Vista cliente: cards y flujo simple. Admin/Barber: tabla y filtros.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as appointmentService from '../../services/appointmentService';
import * as barberService from '../../services/barberService';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import { downloadCSV, printAsPDF } from '../../utils/export';

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_STYLE = {
  scheduled: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
  completed: 'bg-stone-100 text-stone-700 border-stone-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-red-50 text-red-700 border-red-200',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [filterBarber, setFilterBarber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  const isClient = user?.role === 'client';

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { date: filterDate };
      if (isAdmin && filterBarber) params.barberId = filterBarber;
      if (isBarber && user?.barberId) params.barberId = user.barberId;
      if (isClient) {
        delete params.date;
        params.clientId = user?.clientId;
      }
      const data = await appointmentService.getAppointments(params);
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setAppointments(list);
    } catch (err) {
      setError(err?.message || 'Error al cargar citas');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      barberService.getBarbers().then((b) => {
        setBarbers(Array.isArray(b) ? b : b?.data ?? []);
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isBarber && !user?.barberId) return;
    if (isClient && !user?.clientId) return;
    fetchAppointments();
  }, [filterDate, filterBarber, user?.barberId, user?.clientId]);

  // Mensaje de éxito al llegar desde "Agendar cita" (state) o al cancelar
  useEffect(() => {
    if (isClient && location.state?.appointmentCreated) {
      setSuccessMessage('Cita agendada correctamente.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isClient, location.state?.appointmentCreated, location.pathname, navigate]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await appointmentService.updateAppointment(id, { status: newStatus });
      setCancelConfirmId(null);
      fetchAppointments();
      if (isClient && newStatus === 'cancelled') {
        setSuccessMessage('Cita cancelada correctamente.');
      }
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
    }
  };

  const handleCancelClick = (id) => {
    if (isClient) {
      setCancelConfirmId(id);
    } else {
      handleStatusChange(id, 'cancelled');
    }
  };

  const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const pageTitle = isClient ? 'Mis citas' : isBarber ? 'Mis citas' : 'Citas';
  const pageSubtitle = isClient
    ? 'Tus citas y reservas'
    : isBarber
    ? 'Tu agenda operativa por fecha'
    : 'Gestión operativa de citas por fecha';

  // ——— Vista cliente: diseño premium y sencillo ———
  if (isClient) {
    return (
      <div className="min-h-[60vh] bg-stone-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-2xl mx-auto">
            <p className="section-label text-gold">Reservas</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight mb-2">
              Mis citas
            </h1>
            <p className="text-stone-500 mb-8">
              Aquí ves todas tus citas. Puedes agendar una nueva cuando quieras.
            </p>

            {successMessage && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-4" role="status">
                <span className="font-medium">{successMessage}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="shrink-0 p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            )}

            <Link
              to="/appointments/new"
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-6 py-3.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors mb-8"
            >
              <span aria-hidden>+</span>
              Agendar nueva cita
            </Link>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center">
                <p className="text-stone-500">Cargando tus citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-10 sm:p-14 text-center">
                <p className="text-stone-500 mb-6">Aún no tienes citas agendadas.</p>
                <Link
                  to="/appointments/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
                >
                  Agendar mi primera cita
                  <span aria-hidden>→</span>
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {appointments.map((a) => (
                  <li key={a.id}>
                    <article className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden hover:shadow-card-hover hover:border-stone-300 transition-all duration-300">
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[a.status] || 'bg-stone-100 text-stone-700'}`}>
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                          <time className="text-sm text-stone-500" dateTime={a.appointment_date}>
                            {formatDate(a.appointment_date)}
                          </time>
                        </div>
                        <p className="font-semibold text-stone-900 text-lg">
                          {a.service_name}
                        </p>
                        <p className="text-stone-600 text-sm mt-1">
                          {formatTime(a.start_time)} · {a.barber_first_name} {a.barber_last_name}
                        </p>
                        {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                          <div className="mt-4 pt-4 border-t border-stone-100">
                            {cancelConfirmId === a.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-stone-600">¿Cancelar esta cita?</span>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(a.id, 'cancelled')}
                                  className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                  Sí, cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCancelConfirmId(null)}
                                  className="text-sm font-medium text-stone-600 hover:text-stone-800 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCancelClick(a.id)}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Cancelar esta cita
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Vista barbero: diseño premium, cards y filtro por fecha ———
  if (isBarber) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label text-gold">Citas</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
              Mis citas
            </h1>
            <p className="text-stone-500">Por fecha. Cambia el estado o crea una nueva cita.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Fecha</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold"
              />
            </div>
            <Link
              to="/appointments/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal transition-colors text-sm"
            >
              + Nueva cita
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-stone-500">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-12 text-center">
            <p className="text-stone-500 mb-4">No hay citas para esta fecha.</p>
            <Link
              to="/appointments/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
            >
              + Crear cita
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {appointments.map((a) => (
              <li key={a.id}>
                <article className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden hover:shadow-card-hover transition-shadow">
                  <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border mb-2 ${STATUS_STYLE[a.status] || 'bg-stone-100 text-stone-700'}`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                      <p className="font-serif text-lg text-stone-900 font-medium">
                        {formatTime(a.start_time)} — {a.service_name}
                      </p>
                      <p className="text-stone-600 text-sm mt-0.5">
                        {a.client_first_name} {a.client_last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                        <select
                          value={a.status}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                          className="text-sm border border-stone-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-gold/40 focus:border-gold"
                        >
                          <option value="scheduled">Agendada</option>
                          <option value="confirmed">Confirmada</option>
                          <option value="in_progress">En progreso</option>
                          <option value="completed">Completada</option>
                          <option value="cancelled">Cancelada</option>
                          <option value="no_show">No asistió</option>
                        </select>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ——— Vista admin ———
  return (
    <div className="page-shell">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadCSV('citas.csv', appointments.map((a) => ({
                id: a.id,
                fecha: a.appointment_date,
                hora: formatTime(a.start_time),
                cliente: `${a.client_first_name || ''} ${a.client_last_name || ''}`.trim(),
                barbero: `${a.barber_first_name || ''} ${a.barber_last_name || ''}`.trim(),
                servicio: a.service_name || '',
                estado: a.status,
              })))}
              className="btn-admin-outline w-full sm:w-auto"
            >
              Exportar CSV
            </button>
            <button type="button" onClick={printAsPDF} className="btn-admin-outline w-full sm:w-auto">
              Exportar PDF
            </button>
            <Link
              to="/appointments/new"
              className="btn-admin w-full sm:w-auto"
            >
              + Nueva cita
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-premium py-2.5 text-sm"
          />
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Barbero</label>
            <select
              value={filterBarber}
              onChange={(e) => setFilterBarber(e.target.value)}
              className="input-premium py-2.5 text-sm min-w-[180px]"
            >
              <option value="">Todos</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">Cargando...</div>
        </DataCard>
      ) : appointments.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">No hay citas para esta fecha.</div>
        </DataCard>
      ) : (
        <DataCard>
          <Table>
            <TableHead>
              <TableHeader>Hora</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Barbero</TableHeader>
              <TableHeader>Servicio</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatTime(a.start_time)}</TableCell>
                  <TableCell>
                    {a.client_first_name} {a.client_last_name}
                  </TableCell>
                  <TableCell>
                    {a.barber_first_name} {a.barber_last_name}
                  </TableCell>
                  <TableCell>{a.service_name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        a.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : a.status === 'cancelled' || a.status === 'no_show'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!['cancelled', 'no_show', 'completed'].includes(a.status) && (
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        className="text-sm border border-stone-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-gold/40 focus:border-gold"
                      >
                        <option value="scheduled">Agendada</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="no_show">No asistió</option>
                      </select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      )}
    </div>
  );
}
