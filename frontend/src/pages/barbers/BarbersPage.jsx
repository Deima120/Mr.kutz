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
      setBarbers(Array.isArray(data) ? data : data?.barbers || []);
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
        subtitle="Equipo de trabajo"
        actions={
          isAdmin && (
            <Link
              to="/barbers/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm"
            >
              + Nuevo barbero
            </Link>
          )
        }
      />

      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Mostrar inactivos
        </label>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">Cargando...</div>
        </DataCard>
      ) : barbers.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-gray-500">No hay barberos registrados.</div>
        </DataCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b) => (
            <DataCard key={b.id} className={!b.is_active ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {b.first_name} {b.last_name}
                  </h3>
                  <p className="text-gray-500 text-sm mt-0.5">{b.email}</p>
                  {b.phone && (
                    <p className="text-gray-600 text-sm mt-1">{b.phone}</p>
                  )}
                  {b.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {b.specialties.map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-md font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {!b.is_active && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-md font-medium">
                      Inactivo
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <Link
                    to={`/barbers/${b.id}/edit`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium shrink-0"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
}
