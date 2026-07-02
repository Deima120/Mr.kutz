/**
 * Listado de servicios (admin) — categorías en píldoras y paginación
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import * as serviceService from '@/features/services/services/serviceService';
import { ServiceForm } from '@/features/services/pages/ServiceFormPage';
import ServiceStatusToggle, { isServiceActive } from '@/features/services/components/ServiceStatusToggle';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import {
  AdminEntityCard,
  AdminFilterRow,
  AdminListToolbar,
  AdminPagination,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';
import AdminDeleteModal from '@/shared/components/admin/AdminDeleteModal';

const PAGE_SIZE_OPTIONS = [6, 9, 12, 18];

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

const STATUS_FILTERS = [
  { id: 'active', label: 'Activos' },
  { id: 'all', label: 'Todos' },
  { id: 'inactive', label: 'Inactivos' },
];

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formView, setFormView] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;

  useEffect(() => {
    const editMatch = location.pathname.match(/^\/services\/(\d+)\/edit$/);
    if (editMatch) {
      setFormView(parseInt(editMatch[1], 10));
      navigate('/services', { replace: true });
      return;
    }
    if (location.pathname === '/services/new') {
      setFormView('create');
      navigate('/services', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) setSuccessMessage('Servicio creado correctamente.');
    if (updated) setSuccessMessage('Servicio actualizado correctamente.');
    fetchServices();
    setPage(1);
  };

  const openEditForm = (id) => setFormView(id);

  const activeCount = useMemo(() => services.filter((s) => isServiceActive(s)).length, [services]);
  const inactiveCount = useMemo(() => services.filter((s) => !isServiceActive(s)).length, [services]);

  const statusSummary =
    statusFilter === 'inactive'
      ? `${services.length} inactivo${services.length !== 1 ? 's' : ''} — no visibles al agendar`
      : statusFilter === 'all'
        ? `${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}`
        : `${services.length} activo${services.length !== 1 ? 's' : ''} visibles al agendar`;

  const inlineForm = isFormOpen ? (
    <ServiceForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

  const successToast = (
    <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
  );

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const params =
        statusFilter === 'active'
          ? {}
          : statusFilter === 'inactive'
            ? { active: 'inactive' }
            : { active: 'all' };
      const data = await serviceService.getServices(params);
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
  }, [statusFilter]);

  useEffect(() => {
    serviceService
      .getServiceCategories()
      .then((rows) => setCatalogCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCatalogCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, statusFilter, pageSize]);

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

  const categoryOptions = useMemo(
    () => [
      { id: 'all', label: `Todas (${services.length})` },
      ...categoryNamesForFilter.map((name) => ({
        id: name,
        label: `${name} (${countInCategory(name)})`,
      })),
    ],
    [services.length, categoryNamesForFilter, services]
  );

  const handleToggleActive = async (service) => {
    const next = !isServiceActive(service);
    setTogglingId(service.id);
    setError('');
    try {
      await serviceService.updateService(service.id, { isActive: next });
      setSuccessMessage(next ? `"${service.name}" activado.` : `"${service.name}" desactivado.`);
      await fetchServices();
    } catch (err) {
      setError(err?.message || 'Error al actualizar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (id, name) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError('');
    try {
      await serviceService.deleteService(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage(`Servicio "${deleteTarget.name}" eliminado correctamente.`);
      fetchServices();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  const listToolbar = !isFormOpen ? (
    <AdminListToolbar
      summary={statusSummary}
      filters={
        <AdminFilterRow>
          <FilterSelect
            label="Categoría"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            ariaLabel="Filtrar por categoría"
          />
          <FilterSelect
            label="Estado"
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filtrar por estado"
          />
        </AdminFilterRow>
      }
      pagination={
        <AdminPagination
          idPrefix="services"
          page={safePage}
          pageSize={pageSize}
          total={totalFiltered}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          disabled={totalFiltered === 0}
          className="lg:border-l-0 lg:pl-0 pt-0 border-t-0"
        />
      }
    />
  ) : null;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {!isFormOpen && (
        <PageHeader
          actions={
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin inline-flex items-center gap-2 text-sm py-2 px-4"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Nuevo
            </button>
          }
        />
      )}

      {inlineForm}

      {!isFormOpen && error && (
        <div className="alert-error text-sm py-2.5" role="alert">
          {error}
        </div>
      )}

      {listToolbar}

      {!isFormOpen && loading ? (
        <DataCard>
          <div className="py-12 text-center text-stone-500 text-sm">Cargando…</div>
        </DataCard>
      ) : !isFormOpen && services.length === 0 ? (
        <DataCard>
          <div className="py-10 text-center">
            <p className="text-stone-500 text-sm mb-3">
              {statusFilter === 'inactive'
                ? 'No hay servicios inactivos.'
                : statusFilter === 'all'
                  ? 'No hay servicios registrados.'
                  : 'No hay servicios activos.'}
            </p>
            {statusFilter !== 'inactive' && (
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin-outline inline-flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Crear primero
              <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
            </button>
            )}
          </div>
        </DataCard>
      ) : !isFormOpen ? (
        <>
          {totalFiltered === 0 ? (
            <DataCard>
              <p className="text-center text-stone-500 text-sm py-6">
                No hay servicios en esta categoría.
              </p>
            </DataCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
              {paginatedServices.map((s) => {
                const active = isServiceActive(s);
                return (
                <AdminEntityCard key={s.id} inactive={!active}>
                  <div className="flex justify-between items-start gap-3 min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="inline-flex max-w-full truncate px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gold/12 text-gold-dark border border-gold/25">
                          {categoryLabel(s)}
                        </span>
                        <ServiceStatusToggle
                          active={active}
                          disabled={togglingId === s.id}
                          onClick={() => handleToggleActive(s)}
                        />
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
                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <AdminIconButton
                        icon={Pencil}
                        label="Editar servicio"
                        onClick={() => openEditForm(s.id)}
                      />
                      <AdminIconButton
                        icon={Trash2}
                        label="Eliminar servicio"
                        variant="danger"
                        onClick={() => handleDelete(s.id, s.name)}
                      />
                    </div>
                  </div>
                </AdminEntityCard>
              );
              })}
            </div>
          )}
        </>
      ) : null}

      <AdminDeleteModal
        open={Boolean(deleteTarget)}
        title="¿Eliminar servicio?"
        itemName={deleteTarget?.name}
        description={
          deleteTarget ? (
            <>
              ¿Estás seguro de que deseas eliminar permanentemente el servicio{' '}
              <strong className="text-stone-850 font-bold">{deleteTarget.name}</strong>? Esta acción no se puede deshacer.
            </>
          ) : null
        }
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      {successToast}
    </div>
  );
}
