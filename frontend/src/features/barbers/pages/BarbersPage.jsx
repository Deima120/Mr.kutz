/**
 * Listado de barberos
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, CalendarDays } from 'lucide-react';
import * as barberService from '@/features/barbers/services/barberService';
import { BarberForm } from '@/features/barbers/pages/BarberFormPage';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import {
  AdminEntityCard,
  AdminListToolbar,
  SegmentedFilter,
} from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';

const BARBER_STATUS_FILTERS = [
  { id: 'active', label: 'Activos' },
  { id: 'all', label: 'Todos' },
  { id: 'inactive', label: 'Inactivos' },
];

export default function BarbersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [barbers, setBarbers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [documentFilter, setDocumentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formView, setFormView] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;

  useEffect(() => {
    const editMatch = location.pathname.match(/^\/barbers\/(\d+)\/edit$/);
    if (editMatch) {
      setFormView(parseInt(editMatch[1], 10));
      navigate('/barbers', { replace: true });
      return;
    }
    if (location.pathname === '/barbers/new') {
      setFormView('create');
      navigate('/barbers', { replace: true });
    }
  }, [location.pathname, navigate]);

  const fetchBarbers = async () => {
    setLoading(true);
    setError('');
    try {
      const activeParam =
        statusFilter === 'inactive'
          ? 'inactive'
          : statusFilter === 'all'
            ? 'all'
            : undefined;
      const data = await barberService.getBarbers({
        ...(activeParam ? { active: activeParam } : {}),
        document: documentFilter.trim() || undefined,
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
  }, [statusFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchBarbers();
  };

  const activeCount = useMemo(() => barbers.filter((b) => b.is_active !== false).length, [barbers]);
  const inactiveCount = useMemo(() => barbers.filter((b) => b.is_active === false).length, [barbers]);

  const statusSummary =
    statusFilter === 'inactive'
      ? `${barbers.length} inactivo${barbers.length !== 1 ? 's' : ''} en el equipo`
      : statusFilter === 'all'
        ? `${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}`
        : `${barbers.length} barbero${barbers.length !== 1 ? 's' : ''} activo${barbers.length !== 1 ? 's' : ''}`;

  const listToolbar = !isFormOpen ? (
    <AdminListToolbar
      topFilters={
        <SegmentedFilter
          options={BARBER_STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Filtrar barberos por estado"
        />
      }
      summary={statusSummary}
      filterLabel="Documento"
      filterAriaLabel="Filtrar por documento"
      filters={
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
          <input
            type="text"
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
            placeholder="Tipo o número de documento…"
            className="input-premium flex-1 py-2 text-sm min-w-0"
          />
          <button type="submit" className="btn-admin-outline shrink-0 text-sm py-2 px-4">
            Filtrar
          </button>
        </form>
      }
    />
  ) : null;

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) setSuccessMessage('Barbero registrado correctamente.');
    if (updated) setSuccessMessage('Barbero actualizado correctamente.');
    fetchBarbers();
  };

  const openEditForm = (id) => setFormView(id);

  const formHeaderTitle = isCreating ? 'Nuevo barbero' : editingId ? 'Editar barbero' : 'Barberos';
  const formHeaderSubtitle = isCreating
    ? 'Completa el perfil del integrante'
    : editingId
    ? 'Modifica los datos del barbero'
    : 'Equipo de trabajo';

  const inlineForm = isFormOpen ? (
    <BarberForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

  const successToast = (
    <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage('')} />
  );

  return (
    <div className="page-shell animate-fade-in-up">
      {!isFormOpen && isAdmin && (
        <PageHeader
          actions={
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin inline-flex items-center gap-2 text-sm py-2 px-4"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Nuevo barbero
            </button>
          }
        />
      )}

      {isFormOpen ? (
        <DataCard title={formHeaderTitle} compact>
          <p className="text-xs text-stone-500 mb-4">{formHeaderSubtitle}</p>
          {inlineForm}
        </DataCard>
      ) : (
        <>
          {listToolbar}

          {error && (
            <div className="alert-error text-sm py-2.5" role="alert">{error}</div>
          )}

          {loading ? (
            <DataCard compact>
              <div className="py-16 text-center text-stone-500 text-sm">Cargando…</div>
            </DataCard>
          ) : barbers.length === 0 ? (
            <DataCard compact>
              <div className="py-12 text-center">
                <p className="text-stone-500 text-sm mb-3">
                  {statusFilter === 'inactive'
                    ? 'No hay barberos inactivos.'
                    : statusFilter === 'all'
                      ? 'No hay barberos registrados.'
                      : 'No hay barberos activos.'}
                </p>
                {statusFilter !== 'inactive' && isAdmin && (
                  <button
                    type="button"
                    onClick={() => setFormView('create')}
                    className="btn-admin-outline inline-flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    Registrar barbero
                  </button>
                )}
              </div>
            </DataCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {barbers.map((b) => (
                <AdminEntityCard key={b.id} inactive={!b.is_active}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-medium text-stone-900">
                        {b.first_name} {b.last_name}
                      </h3>
                      <p className="text-stone-500 text-sm mt-0.5">{b.email}</p>
                      {b.phone && (
                        <p className="text-stone-600 text-sm mt-1">{b.phone}</p>
                      )}
                      <p className="text-stone-500 text-xs mt-1">
                        Doc.: {[b.document_type, b.document_number].filter(Boolean).join(' ') || '—'}
                      </p>
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
                      <div className="inline-flex items-center gap-1.5 shrink-0">
                        <AdminIconButton
                          icon={CalendarDays}
                          label="Horarios"
                          to={`/barbers/${b.id}/schedules`}
                        />
                        <AdminIconButton
                          icon={Pencil}
                          label="Editar barbero"
                          onClick={() => openEditForm(b.id)}
                        />
                      </div>
                    )}
                  </div>
                </AdminEntityCard>
              ))}
            </div>
          )}
        </>
      )}
      {successToast}
    </div>
  );
}
