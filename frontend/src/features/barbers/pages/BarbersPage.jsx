/**
 * Listado de barberos
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, CalendarDays, CalendarOff, Trash2 } from 'lucide-react';
import * as barberService from '@/features/barbers/services/barberService';
import * as exceptionService from '@/features/barbers/services/barberScheduleExceptionService';
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
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import AdminStatusToggle from '@/shared/components/admin/AdminStatusToggle';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import { formatAppointmentCalendarDate } from '@/shared/utils/appointmentTime';

/** Mismo criterio que BarberSchedulesPage.jsx: nunca `new Date(ymd)` directo. */
const showYmd = (ymd) => formatAppointmentCalendarDate(ymd, 'es-CO', { weekday: undefined, year: 'numeric' });

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

  // Festivo para todos los barberos a la vez — acción global, no por barbero
  // (ver /barbers/:id/schedules para las ausencias individuales).
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ dateFrom: '', dateTo: '', reason: '' });
  const [holidayError, setHolidayError] = useState('');
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayConfirmation, setHolidayConfirmation] = useState(null);

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

  const openHolidayModal = () => {
    setHolidayForm({ dateFrom: '', dateTo: '', reason: '' });
    setHolidayError('');
    setHolidayConfirmation(null);
    setHolidayModalOpen(true);
  };

  const submitHoliday = async (payload) => {
    setHolidaySaving(true);
    setHolidayError('');
    try {
      const result = await exceptionService.createScheduleException(payload);
      if (result?.needsConfirmation) {
        setHolidayConfirmation({ payload, affectedAppointments: result.affectedAppointments || [] });
        return;
      }
      toast.success(`Festivo registrado para ${result.exceptions.length} barbero(s).`);
      setHolidayModalOpen(false);
      setHolidayConfirmation(null);
    } catch (err) {
      setHolidayError(getApiErrorMessage(err, 'Error al registrar el festivo'));
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleHolidaySubmit = (e) => {
    e.preventDefault();
    setHolidayError('');
    if (!holidayForm.dateFrom || !holidayForm.dateTo) {
      setHolidayError('Indica la fecha de inicio y de fin.');
      return;
    }
    if (holidayForm.dateFrom > holidayForm.dateTo) {
      setHolidayError('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    submitHoliday({
      applyToAllBarbers: true,
      type: 'holiday',
      dateFrom: holidayForm.dateFrom,
      dateTo: holidayForm.dateTo,
      reason: holidayForm.reason.trim() || undefined,
    });
  };

  const handleHolidayConfirmAnyway = () => {
    if (!holidayConfirmation) return;
    submitHoliday({ ...holidayConfirmation.payload, confirmed: true });
  };

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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openHolidayModal}
                className="btn-admin-outline inline-flex items-center gap-2 text-sm py-2 px-4"
              >
                <CalendarOff className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Marcar festivo
              </button>
              <button
                type="button"
                onClick={() => setFormView('create')}
                className="btn-admin inline-flex items-center gap-2 text-sm py-2 px-4"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                Nuevo barbero
              </button>
            </div>
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
                      {/* Solo admin puede cambiar el estado; el resto ve la etiqueta sin accion,
                          coherente con como esta gateada el resto de la tarjeta. */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {isAdmin ? (
                          <AdminStatusToggle
                            active={Boolean(b.is_active)}
                            disabled={togglingId === b.id}
                            onClick={() => handleToggleActive(b)}
                            activeTitle="Clic para desactivar (no visible al agendar)"
                            inactiveTitle="Clic para activar"
                          />
                        ) : (
                          !b.is_active && (
                            <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                              Inactivo
                            </span>
                          )
                        )}
                      </div>
                      <h3 className="font-serif text-base font-semibold text-stone-900">
                        {b.first_name} {b.last_name}
                      </h3>
                      {/* El correo en dorado es el acento de la tarjeta, como en
                          la referencia aprobada: distingue el dato de contacto
                          principal del resto sin recargar la tarjeta. */}
                      <p className="mt-0.5 truncate text-sm font-medium text-gold-dark" title={b.email}>
                        {b.email}
                      </p>
                      <div className="mt-2.5 space-y-0.5 border-t border-stone-100 pt-2.5">
                        {b.phone && <p className="text-sm text-stone-700">{b.phone}</p>}
                        <p className="text-xs text-stone-500">
                          Doc.: {[b.document_type, b.document_number].filter(Boolean).join(' ') || '—'}
                        </p>
                      </div>
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

      <AdminModalShell
        open={holidayModalOpen}
        onClose={() => !holidaySaving && setHolidayModalOpen(false)}
        title="Marcar festivo"
        subtitle="Cierra el negocio ese rango de fechas para TODOS los barberos activos"
        size="sm"
        preventClose={holidaySaving}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setHolidayModalOpen(false)}
              disabled={holidaySaving}
              className="btn-admin-outline text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="holiday-form"
              disabled={holidaySaving}
              className="btn-admin text-sm disabled:opacity-50"
            >
              {holidaySaving ? 'Guardando…' : 'Registrar festivo'}
            </button>
          </div>
        }
      >
        <form id="holiday-form" onSubmit={handleHolidaySubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block text-[11px] font-bold tracking-wider text-stone-500 mb-1.5">Desde</span>
              <input
                type="date"
                value={holidayForm.dateFrom}
                onChange={(e) => setHolidayForm((p) => ({ ...p, dateFrom: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-200/90 bg-stone-50/80"
              />
            </label>
            <label>
              <span className="block text-[11px] font-bold tracking-wider text-stone-500 mb-1.5">Hasta</span>
              <input
                type="date"
                value={holidayForm.dateTo}
                onChange={(e) => setHolidayForm((p) => ({ ...p, dateTo: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-200/90 bg-stone-50/80"
              />
            </label>
          </div>
          <label>
            <span className="block text-[11px] font-bold tracking-wider text-stone-500 mb-1.5">Motivo (opcional)</span>
            <input
              type="text"
              value={holidayForm.reason}
              onChange={(e) => setHolidayForm((p) => ({ ...p, reason: e.target.value.slice(0, 300) }))}
              placeholder="Ej.: 25 de diciembre"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-200/90 bg-stone-50/80"
            />
          </label>
          {holidayError ? <p className="text-sm text-rose-700">{holidayError}</p> : null}
        </form>
      </AdminModalShell>

      <AdminConfirmModal
        open={Boolean(holidayConfirmation)}
        variant="warning"
        title="Hay citas agendadas en ese rango"
        description="Estas citas quedarán con el negocio cerrado ese día. Puedes confirmar igual y reagendarlas después, o cancelar y resolverlas primero."
        confirmLabel="Registrar de todas formas"
        isSubmitting={holidaySaving}
        onConfirm={handleHolidayConfirmAnyway}
        onCancel={() => setHolidayConfirmation(null)}
      >
        <ul className="space-y-1.5 text-sm text-stone-700">
          {(holidayConfirmation?.affectedAppointments || []).map((a) => (
            <li key={a.id} className="rounded-lg border border-stone-200 px-3 py-2">
              <span className="font-medium">{a.clientName || 'Cliente'}</span> — {showYmd(a.appointmentDate)}
              {a.barberName ? ` · ${a.barberName}` : ''}
            </li>
          ))}
        </ul>
      </AdminConfirmModal>
    </div>
  );
}
