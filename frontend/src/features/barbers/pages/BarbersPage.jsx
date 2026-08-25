/**
 * Listado de barberos
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, CalendarDays, Power, Trash2 } from 'lucide-react';
import * as barberService from '@/features/barbers/services/barberService';
import { BarberForm } from '@/features/barbers/pages/BarberFormPage';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import {
  AdminEntityCard,
  AdminFilterRow,
  AdminListToolbar,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import { useAppToast } from '@/shared/feedback/ToastContext';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';

const BARBER_STATUS_FILTERS = [
  { id: 'active', label: 'Activos' },
  { id: 'all', label: 'Todos' },
  { id: 'inactive', label: 'Inactivos' },
];

export default function BarbersPage() {
  const { user } = useAuth();
  const toast = useAppToast();
  const isAdmin = user?.role === 'admin';
  const [barbers, setBarbers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [documentFilter, setDocumentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [formView, setFormView] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

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
      toast.error(err?.message || 'Error al cargar barberos');
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
      summary={statusSummary}
      filters={
        <div className="space-y-3 w-full min-w-0">
          <AdminFilterRow>
            <FilterSelect
              label="Estado"
              options={BARBER_STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filtrar barberos por estado"
            />
          </AdminFilterRow>
          <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-2 w-full">
            <input
              type="text"
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value)}
              placeholder="Tipo o número de documento…"
              className="input-premium flex-1 py-2 text-sm min-w-0 w-full"
            />
            <button type="submit" className="btn-admin-outline shrink-0 text-sm py-2 px-4 w-full sm:w-auto">
              Filtrar
            </button>
          </form>
        </div>
      }
    />
  ) : null;

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) toast.success('Barbero registrado correctamente.');
    if (updated) toast.success('Barbero actualizado correctamente.');
    fetchBarbers();
  };

  /**
   * Activar/desactivar es reversible, así que va sin modal de confirmación
   * (convención de frontend/docs/FEEDBACK.md): basta el toast del resultado.
   */
  const handleToggleActive = async (barber) => {
    const nextActive = !barber.is_active;
    setTogglingId(barber.id);
    try {
      await barberService.setBarberActive(barber.id, nextActive);
      toast.success(
        `${barber.first_name} ${barber.last_name} ${nextActive ? 'activado' : 'desactivado'} correctamente.`
      );
      fetchBarbers();
    } catch (err) {
      toast.error(err?.message || 'No se pudo cambiar el estado del barbero.');
    } finally {
      setTogglingId(null);
    }
  };

  /**
   * Borrado definitivo: el backend solo lo permite si el barbero no tiene citas
   * ni comisiones. Si las tiene responde 409 y el mensaje sugiere desactivarlo,
   * que es lo que se muestra tal cual en el toast.
   */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await barberService.deleteBarber(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(`Barbero "${deleteTarget.name}" eliminado correctamente.`);
      fetchBarbers();
    } catch (err) {
      setDeleteTarget(null);
      toast.error(err?.message || 'No se pudo eliminar el barbero.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditForm = (id) => setFormView(id);

  const inlineForm = isFormOpen ? (
    <BarberForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

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
        inlineForm
      ) : (
        <>
          {listToolbar}

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
                        <AdminIconButton
                          icon={Power}
                          label={b.is_active ? 'Desactivar barbero' : 'Activar barbero'}
                          variant={b.is_active ? 'default' : 'primary'}
                          disabled={togglingId === b.id}
                          onClick={() => handleToggleActive(b)}
                        />
                        <AdminIconButton
                          icon={Trash2}
                          label="Eliminar barbero"
                          variant="danger"
                          onClick={() =>
                            setDeleteTarget({
                              id: b.id,
                              name: `${b.first_name} ${b.last_name}`.trim(),
                            })
                          }
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

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Eliminar barbero?"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar permanentemente a{' '}
              <strong className="text-stone-800">{deleteTarget.name}</strong>? Se borra también su
              cuenta de acceso y esta acción no se puede deshacer. Si ya tiene citas o comisiones
              registradas no se podrá borrar: desactívalo en su lugar.
            </>
          ) : null
        }
        confirmLabel="Sí, eliminar"
        submittingLabel="Eliminando…"
        isSubmitting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
