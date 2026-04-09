/**
 * Detalle de cliente con historial de servicios
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as clientService from '../../services/clientService';

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
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return <div className="py-12 text-center text-gray-500">Cargando...</div>;
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Cliente no encontrado'}</p>
        <Link to="/clients" className="text-primary-600 hover:text-primary-700">
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

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr instanceof Date) {
      const hh = String(timeStr.getHours()).padStart(2, '0');
      const mm = String(timeStr.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const s = String(timeStr);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && s.includes('T')) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    const iso = s.match(/T(\d{1,2}):(\d{2})/);
    if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
    const any = s.match(/(\d{1,2}):(\d{2})/);
    if (any) {
      const hh = String(any[1]).padStart(2, '0');
      return `${hh}:${any[2]}`;
    }
    return s.slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {client.first_name} {client.last_name}
          </h2>
          <p className="text-gray-500 text-sm">Cliente #{client.id}</p>
        </div>
        <Link
          to={`/clients/${id}/edit`}
          className="inline-flex px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          Editar cliente
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Información</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Correo electrónico</dt>
              <dd>{client.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Teléfono</dt>
              <dd>{client.phone || '-'}</dd>
            </div>
            {(client.document_type || client.document_number) && (
              <div>
                <dt className="text-gray-500">Documento</dt>
                <dd>
                  {[client.document_type, client.document_number].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Registrado</dt>
              <dd>{formatDate(client.created_at)}</dd>
            </div>
            {client.notes && (
              <div>
                <dt className="text-gray-500">Notas</dt>
                <dd className="mt-1 text-sm leading-snug line-clamp-4">{client.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Historial de servicios</h3>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin citas registradas</p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-start text-sm border-b border-gray-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.service_name}</p>
                    <p className="text-gray-500 text-xs">
                      {formatDate(item.appointment_date)} · {formatTime(item.start_time)} ·{' '}
                      {item.barber_first_name} {item.barber_last_name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      item.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'cancelled' || item.status === 'no_show'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link to="/clients" className="text-primary-600 hover:text-primary-700 text-sm">
        ← Volver a clientes
      </Link>
    </div>
  );
}
