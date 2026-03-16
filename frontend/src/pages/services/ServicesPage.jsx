/**
 * Listado de servicios (admin)
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label text-gold">Catálogo</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
            Servicios
          </h1>
          <p className="text-stone-500">Cortes y tratamientos que ofreces. Los activos aparecen al agendar.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-stone-300 text-gold focus:ring-gold/40"
            />
            Mostrar inactivos
          </label>
          <Link
            to="/services/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal transition-colors text-sm"
          >
            + Nuevo servicio
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-500">Cargando...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-card p-12 text-center">
          <p className="text-stone-500 mb-4">No hay servicios registrados.</p>
          <Link
            to="/services/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
          >
            + Crear primer servicio
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.id}
              className={`bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden ${!s.is_active ? 'opacity-70' : ''}`}
            >
              <div className="p-5 sm:p-6 flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {!s.is_active && (
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg font-medium text-stone-900">{s.name}</h3>
                  {s.description && (
                    <p className="text-stone-500 text-sm mt-1 line-clamp-2">{s.description}</p>
                  )}
                  <p className="mt-2 text-gold font-semibold">
                    ${parseFloat(s.price).toFixed(2)} · {s.duration_minutes} min
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link
                    to={`/services/${s.id}/edit`}
                    className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id, s.name)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium text-left"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
