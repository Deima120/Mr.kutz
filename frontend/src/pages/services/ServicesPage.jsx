/**
 * Listado de servicios (admin) — categorías en píldoras y paginación
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import * as serviceService from '../../services/serviceService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';

const PAGE_SIZE_OPTIONS = [6, 9, 12, 18];

const fieldSelectClass =
  'min-w-0 max-w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-gold focus:ring-2 focus:ring-gold/40 outline-none';

function isHiddenCategoryName(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase();
  return n === 'general' || n === 'barbas';
}

function categoryLabel(s) {
  const raw = s.category_name || 'Cortes';
  if (isHiddenCategoryName(raw)) return 'Cortes';
  return raw;
}

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
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

  useEffect(() => {
    serviceService
      .getServiceCategories()
      .then((rows) => setCatalogCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCatalogCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, showInactive, pageSize]);

  const categoryNamesForFilter = useMemo(() => {
    const fromApi = catalogCategories.map((c) => c.name).filter((n) => n && !isHiddenCategoryName(n));
    const fromServices = [...new Set(services.map((s) => categoryLabel(s)))].filter((n) => !isHiddenCategoryName(n));
    return Array.from(new Set([...fromApi, ...fromServices])).sort((a, b) => a.localeCompare(b, 'es'));
  }, [catalogCategories, services]);

  useEffect(() => {
    if (categoryFilter !== 'all' && isHiddenCategoryName(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryNamesForFilter]);

  const filteredServices = useMemo(() => {
    if (categoryFilter === 'all') return services;
    return services.filter((s) => categoryLabel(s) === categoryFilter);
  }, [services, categoryFilter]);

  const totalFiltered = filteredServices.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const paginatedServices = filteredServices.slice(sliceStart, sliceStart + pageSize);

  const countInCategory = (name) =>
    services.filter((s) => categoryLabel(s) === name).length;

  const chipBase =
    'inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all border';
  const chipInactive = `${chipBase} border-stone-200 bg-white text-stone-700 hover:border-gold/45 hover:text-barber-dark`;
  const chipActive = `${chipBase} border-barber-dark bg-barber-dark text-white shadow-md`;

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
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        compact
        title="Servicios"
        label="Catálogo"
        subtitle="Activos visibles al agendar; puedes filtrar por categoría."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 cursor-pointer bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-stone-300 text-gold focus:ring-gold/40"
              />
              Inactivos
            </label>
            <Link to="/services/new" className="btn-admin text-sm py-2 px-4">
              + Nuevo
            </Link>
          </div>
        }
      />

      {error && (
        <div className="alert-error text-sm py-2.5" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <DataCard>
          <div className="py-12 text-center text-stone-500 text-sm">Cargando…</div>
        </DataCard>
      ) : services.length === 0 ? (
        <DataCard>
          <div className="py-10 text-center">
            <p className="text-stone-500 text-sm mb-3">No hay servicios registrados.</p>
            <Link to="/services/new" className="btn-admin-outline inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Crear primero
              <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </DataCard>
      ) : (
        <>
          <DataCard className="max-w-full min-w-0">
            <div className="w-full min-w-0 max-w-full flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="min-w-0 flex-1 max-w-full">
                <span className="text-[11px] font-bold tracking-wider text-stone-500 block mb-2">Categorías</span>
                <div className="flex flex-wrap gap-2 min-w-0 max-w-full" role="group" aria-label="Filtrar por categoría">
                  <button
                    type="button"
                    aria-pressed={categoryFilter === 'all'}
                    onClick={() => setCategoryFilter('all')}
                    className={categoryFilter === 'all' ? chipActive : chipInactive}
                  >
                    Todas ({services.length})
                  </button>
                  {categoryNamesForFilter.map((name) => {
                    const n = countInCategory(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={categoryFilter === name}
                        onClick={() => setCategoryFilter(name)}
                        className={categoryFilter === name ? chipActive : chipInactive}
                      >
                        {name} ({n})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 lg:pl-6 lg:border-l lg:border-stone-200/90 pt-3 border-t border-stone-200/90 lg:border-t-0 lg:pt-0 min-w-0">
                <div className="flex items-center gap-2">
                  <label htmlFor="services-page-size" className="text-xs font-semibold text-stone-500 whitespace-nowrap">
                    Por página
                  </label>
                  <select
                    id="services-page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className={`${fieldSelectClass} w-auto min-w-[4.5rem]`}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  className="flex items-center gap-1.5 sm:gap-2"
                  role="navigation"
                  aria-label="Cambiar página"
                >
                  <button
                    type="button"
                    disabled={safePage <= 1 || totalFiltered === 0}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  <span className="text-xs sm:text-sm font-semibold text-stone-800 tabular-nums min-w-[2.75rem] text-center px-0.5">
                    {safePage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages || totalFiltered === 0}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-stone-900 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </DataCard>

          {totalFiltered === 0 ? (
            <DataCard>
              <p className="text-center text-stone-500 text-sm py-6">
                No hay servicios en esta categoría.
              </p>
            </DataCard>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
                {paginatedServices.map((s) => (
                  <article
                    key={s.id}
                    className={`rounded-xl border border-stone-200/90 bg-white p-4 shadow-card min-w-0 ${
                      !s.is_active ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3 min-w-0">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="inline-flex max-w-full truncate px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gold/12 text-gold-dark border border-gold/25">
                            {categoryLabel(s)}
                          </span>
                          {!s.is_active && (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif text-base font-medium text-stone-900 truncate" title={s.name}>
                          {s.name}
                        </h3>
                        {s.description && (
                          <p className="text-stone-500 text-xs mt-1 line-clamp-2">{s.description}</p>
                        )}
                        <p className="mt-1.5 text-gold text-sm font-semibold tabular-nums">
                          ${parseFloat(s.price).toFixed(2)} · {s.duration_minutes} min
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0 text-right">
                        <Link
                          to={`/services/${s.id}/edit`}
                          className="text-xs sm:text-sm font-semibold text-barber-dark hover:text-gold transition-colors whitespace-nowrap"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.name)}
                          className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
