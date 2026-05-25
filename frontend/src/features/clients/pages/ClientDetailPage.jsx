/**
 * Detalle de cliente con historial de servicios
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Award,
  Scissors,
  Clock,
  User,
  MessageSquare,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as clientService from '@/features/clients/services/clientService';
import {
  formatAppointmentCalendarDate,
  formatAppointmentClockTime,
  appointmentNotesOf,
} from '@/shared/utils/appointmentTime';

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await clientService.deleteClient(id);
      setShowDeleteModal(false);
      navigate('/clients', { 
        state: { successMessage: `Cliente "${client.first_name} ${client.last_name}" eliminado correctamente.` } 
      });
    } catch (err) {
      setError(err?.message || 'Error al eliminar cliente');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clientData, historyData] = await Promise.all([
          clientService.getClientById(id),
          clientService.getClientHistory(id),
        ]);
        setClient(clientData);
        setHistory(historyData || []);
      } catch {
        setError('Cliente no encontrado');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold border-t-transparent mb-4"></div>
        <p className="text-stone-500 font-medium animate-pulse">Cargando expediente del cliente...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 p-8 shadow-card max-w-md mx-auto my-6 animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <p className="text-stone-700 font-semibold text-lg mb-2">{error || 'Cliente no encontrado'}</p>
        <p className="text-stone-500 text-sm mb-6">El expediente que buscas no existe o ha sido retirado.</p>
        <Link 
          to="/clients" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-medium transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a clientes
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Extraer iniciales para el avatar
  const getInitials = () => {
    const first = client.first_name?.[0] || '';
    const last = client.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  // Calcular estadísticas
  const totalAppointments = history.length;
  const completedAppointments = history.filter((item) => item.status === 'completed').length;
  const isFrequent = completedAppointments >= 3;

  return (
    <div className="space-y-4 max-w-6xl mx-auto p-1 animate-fade-in-up">
      {/* Cabecera / Tarjeta Hero del Perfil */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 md:p-6 shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden">
        {/* Gradiente radial de fondo en dorado (branding) */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-radial-gold pointer-events-none opacity-60"></div>

        <div className="relative flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left w-full">
            {/* Avatar Premium */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-850 text-gold font-serif text-3xl font-bold shadow-md border-2 border-gold/45 select-none group-hover:scale-105 group-hover:border-gold transition-all duration-350">
                {getInitials()}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-950 border border-gold/40 shadow-sm text-[10px] text-gold font-bold">
                ★
              </span>
            </div>

            {/* Datos Principales e Indicadores */}
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
                    {client.first_name} {client.last_name}
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isFrequent 
                      ? 'bg-gold/10 text-gold-dark border border-gold/30' 
                      : 'bg-stone-100 text-stone-600 border border-stone-200/50'
                  }`}>
                    {isFrequent ? (
                      <>
                        <Award className="w-3 h-3 shrink-0 text-gold-dark" />
                        Cliente Frecuente
                      </>
                    ) : (
                      'Cliente Registrado'
                    )}
                  </span>
                </div>
                <p className="text-stone-500 text-sm mt-1 font-medium">Cliente ID: #{client.id}</p>
              </div>

              {/* Métricas Rápidas */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 pt-1">
                <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-center sm:text-left flex items-center gap-3 transition-colors hover:bg-stone-100/50">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold-dark shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Citas Totales</span>
                    <span className="text-sm font-extrabold text-stone-850">{totalAppointments}</span>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 text-center sm:text-left flex items-center gap-3 transition-colors hover:bg-stone-100/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Completadas</span>
                    <span className="text-sm font-extrabold text-stone-850">{completedAppointments}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            
            <Link
              to={`/clients/${id}/edit`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-gold hover:text-gold-light border border-stone-800 hover:border-gold/45 rounded-xl font-semibold shadow-sm transition-all duration-300 transform active:scale-95 group text-sm shrink-0"
            >
              <Edit className="w-4 h-4 transition-transform group-hover:rotate-12" />
              Editar cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de Información y Línea de Tiempo */}
      <div className="grid gap-4 md:grid-cols-5">
        
        {/* Bloque de Información Organizado (2/5 Columnas) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 space-y-4">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-stone-850 text-base">Información de Contacto</h3>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Datos Generales</span>
            </div>

            <div className="space-y-4">
              {/* Correo Electrónico */}
              <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-50 hover:border-stone-100 hover:bg-stone-50/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50/60 text-gold-dark flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Correo electrónico</span>
                  {client.email ? (
                    <a 
                      href={`mailto:${client.email}`} 
                      className="block text-sm font-semibold text-stone-800 hover:text-gold-dark truncate transition-colors"
                    >
                      {client.email}
                    </a>
                  ) : (
                    <span className="block text-sm text-stone-400 font-medium italic">Sin correo registrado</span>
                  )}
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-50 hover:border-stone-100 hover:bg-stone-50/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50/60 text-gold-dark flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Teléfono</span>
                  {client.phone ? (
                    <a 
                      href={`tel:${client.phone}`} 
                      className="block text-sm font-semibold text-stone-800 hover:text-gold-dark truncate transition-colors"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <span className="block text-sm text-stone-400 font-medium italic">Sin teléfono registrado</span>
                  )}
                </div>
              </div>

              {/* Documento de Identidad */}
              <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-50 hover:border-stone-100 hover:bg-stone-50/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50/60 text-gold-dark flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-colors">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Documento de Identidad</span>
                  <span className="block text-sm font-semibold text-stone-800">
                    {[client.document_type, client.document_number].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              </div>

              {/* Fecha de Registro */}
              <div className="flex items-center gap-4 p-3 rounded-xl border border-stone-50 hover:border-stone-100 hover:bg-stone-50/40 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-amber-50/60 text-gold-dark flex items-center justify-center shrink-0 group-hover:bg-gold/10 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] text-stone-400 uppercase tracking-wider font-bold">Fecha de Registro</span>
                  <span className="block text-sm font-semibold text-stone-800">
                    {formatDate(client.created_at)}
                  </span>
                </div>
              </div>

              {/* Notas del Administrador */}
              {client.notes && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-150 mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-stone-600">
                    <MessageSquare className="w-4 h-4 shrink-0 text-gold-dark" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500">Notas sobre el Cliente</span>
                  </div>
                  <p className="text-stone-700 text-xs leading-relaxed italic">"{client.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Línea de Tiempo del Historial (3/5 Columnas) */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-bold text-stone-850 text-base">Historial de servicios</h3>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Servicios Recibidos</span>
            </div>

            <div className="flex-1 min-h-[300px]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Scissors className="w-12 h-12 text-stone-200 mb-2" />
                  <p className="text-stone-500 text-sm font-medium">Sin citas registradas aún.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-stone-100 ml-3.5 pl-5 pr-2 space-y-4 max-h-[300px] overflow-y-auto admin-content-scroll">
                  {history.map((item) => {
                    const noteText = appointmentNotesOf(item);
                    
                    // Elegir clase de color según el estatus
                    let statusDotColors = 'bg-stone-300';
                    let statusBadgeColors = 'bg-stone-50 text-stone-700 border-stone-200/60';
                    
                    if (item.status === 'completed') {
                      statusDotColors = 'bg-emerald-500';
                      statusBadgeColors = 'bg-emerald-50/70 text-emerald-700 border-emerald-100';
                    } else if (item.status === 'cancelled' || item.status === 'no_show') {
                      statusDotColors = 'bg-rose-500';
                      statusBadgeColors = 'bg-rose-50/70 text-rose-700 border-rose-100';
                    } else if (item.status === 'scheduled' || item.status === 'confirmed') {
                      statusDotColors = 'bg-amber-400';
                      statusBadgeColors = 'bg-amber-50/70 text-amber-800 border-amber-200/50';
                    }

                    return (
                      <div key={item.id} className="relative group">
                        {/* Nodo de la línea de tiempo */}
                        <span className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${statusDotColors} z-10 transition-transform group-hover:scale-125 duration-350`}></span>

                        {/* Contenedor de la Cita */}
                        <div className="p-4 rounded-xl border border-stone-50 hover:border-stone-100 hover:bg-stone-50/30 transition-all duration-200">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <h4 className="font-bold text-stone-850 text-sm group-hover:text-gold-dark transition-colors duration-200">
                                {item.service_name}
                              </h4>
                              
                              {/* Subdetalles */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-stone-500 text-xs font-medium">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                  {formatAppointmentCalendarDate(item.appointment_date, 'es-ES', {
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-stone-300">•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                                  {formatAppointmentClockTime(item.start_time)}
                                </span>
                                <span className="text-stone-300">•</span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-stone-400" />
                                  {item.barber_first_name} {item.barber_last_name}
                                </span>
                              </div>

                              {/* Nota de la cita */}
                              {noteText && (
                                <div className="mt-2.5 pl-3 border-l-2 border-amber-300 text-stone-600 text-xs bg-amber-50/20 py-1.5 pr-2.5 rounded-r-lg">
                                  <span className="font-bold text-[10px] text-amber-800 uppercase tracking-wider block mb-0.5">Nota de cita:</span>
                                  {noteText}
                                </div>
                              )}
                            </div>

                            {/* Badge de Estatus */}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeColors} shrink-0`}>
                              {STATUS_LABELS[item.status] || item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Botón Volver */}
      <div className="pt-2">
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-850 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-stone-50 border border-stone-200/40 hover:border-stone-200 transition-all duration-200 group shadow-sm shrink-0 bg-white"
        >
          <ChevronLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} aria-hidden />
          Volver a clientes
        </Link>
      </div>
      {/* Modal de Confirmación de Eliminación Premium */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 max-w-sm w-full animate-fade-in-up duration-300 relative overflow-hidden">
            {/* Adorno sutil gradiente */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500"></div>

            <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>

            <h3 className="font-serif text-lg font-bold text-stone-900 text-center mb-2">
              ¿Eliminar cliente?
            </h3>
            
            <p className="text-stone-500 text-xs sm:text-sm text-center leading-relaxed mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente el expediente de{' '}
              <strong className="text-stone-850 font-bold">{client.first_name} {client.last_name}</strong>? 
              Esta acción no se puede deshacer y retirará toda su información.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-bold rounded-xl text-sm transition-all border border-stone-200/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 duration-200 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    Eliminando...
                  </>
                ) : (
                  'Sí, eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

