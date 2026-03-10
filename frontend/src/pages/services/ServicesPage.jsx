/**
 * Listado de servicios
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as serviceService from '../../services/serviceService';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await serviceService.getServices({
        active: showInactive ? 'false' : undefined,
      });
      setServices(Array.isArray(data) ? data : data?.services || []);
    } catch (err) {
      setError(err?.message || 'Error al cargar servicios');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [showInactive]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar servicio "${name}"?`)) return;
    try {
      await serviceService.deleteService(id);
      fetchServices();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Servicios</h2>
        <Link
          to="/services/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          + Nuevo servicio
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar inactivos
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center text-gray-500">
          No hay servicios registrados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-xl shadow border p-6 ${
                !s.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{s.name}</h3>
                  {s.description && (
                    <p className="text-gray-500 text-sm mt-1">{s.description}</p>
                  )}
                  <p className="mt-2 text-primary-600 font-medium">
                    ${parseFloat(s.price).toFixed(2)} · {s.duration_minutes} min
                  </p>
                  {!s.is_active && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/services/${s.id}/edit`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
