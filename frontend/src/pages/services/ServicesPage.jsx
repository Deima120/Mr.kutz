/**
 * Listado de servicios (admin)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as serviceService from '../../services/serviceService';
import { downloadCSV, printAsPDF } from '../../utils/export';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
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

  const categories = Array.from(
    new Set(services.map((s) => s.category_name || 'General'))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const filteredServices =
    categoryFilter === 'all'
      ? services
      : services.filter((s) => (s.category_name || 'General') === categoryFilter);

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
    <div className="page-shell">
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
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-600 font-medium" htmlFor="svc-cat-filter">
              Categoría
            </label>
            <select
              id="svc-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-premium py-2.5 text-sm w-[220px]"
            >
              <option value="all">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => downloadCSV('servicios.csv', filteredServices.map((s) => ({
              id: s.id,
              nombre: s.name,
              descripcion: s.description || '',
              categoria: s.category_name || 'General',
              precio: s.price,
              duracion_minutos: s.duration_minutes,
              activo: s.is_active ? 'Sí' : 'No',
            })))}
            className="btn-admin-outline"
          >
            Exportar CSV
          </button>
          <button type="button" onClick={printAsPDF} className="btn-admin-outline">
            Exportar PDF
          </button>
          <Link
            to="/services/new"
            className="btn-admin"
          >
            + Nuevo servicio
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-500">Cargando...</div>
      ) : filteredServices.length === 0 ? (
        <div className="empty-state">
          <p className="text-stone-500 mb-4">No hay servicios para esta categoría.</p>
          <Link
            to="/services/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
          >
            + Crear primer servicio
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : categoryFilter === 'all' ? (
          (() => {
            const grouped = filteredServices.reduce((acc, s) => {
              const key = s.category_name || 'General';
              if (!acc[key]) acc[key] = [];
              acc[key].push(s);
              return acc;
            }, {});

            return Object.entries(grouped).map(([cat, list]) => (
              <section key={cat} className="space-y-3">
                <p className="section-label text-gold mb-0 mt-2">{cat}</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((s) => (
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
              </section>
            ));
          })()
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((s) => (
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
        )
      }
    </div>
  );
}
