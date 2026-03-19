/**
 * Listado de barberos
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as barberService from '../../services/barberService';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';

export default function BarbersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [barbers, setBarbers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBarbers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await barberService.getBarbers({
        active: showInactive ? 'false' : undefined,
      });
      setBarbers(Array.isArray(data) ? data : data?.data ?? data?.barbers ?? []);
    } catch (err) {
      setError(err?.message || 'Error al cargar barberos');
      setBarbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, [showInactive]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barberos"
        label="Equipo"
        subtitle="Equipo de trabajo"
        actions={
          isAdmin && (
            <Link to="/barbers/new" className="btn-admin">
              + Nuevo barbero
            </Link>
          )
        }
      />

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-stone-300 text-gold focus:ring-gold/40"
          />
          Mostrar inactivos
        </label>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">Cargando...</div>
        </DataCard>
      ) : barbers.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">No hay barberos registrados.</div>
        </DataCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b) => (
            <DataCard key={b.id} className={!b.is_active ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-stone-900">
                    {b.first_name} {b.last_name}
                  </h3>
                  <p className="text-stone-500 text-sm mt-0.5">{b.email}</p>
                  {b.phone && (
                    <p className="text-stone-600 text-sm mt-1">{b.phone}</p>
                  )}
                  {b.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {b.specialties.map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 bg-gold/10 text-gold-dark text-xs rounded-lg font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {!b.is_active && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-stone-200 text-stone-600 text-xs rounded-lg font-medium">
                      Inactivo
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/barbers/${b.id}/schedules`}
                      className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                    >
                      Horarios
                    </Link>
                    <Link
                      to={`/barbers/${b.id}/edit`}
                      className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
                )}
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
}
