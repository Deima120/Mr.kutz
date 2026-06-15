/**
 * Listado de barberos
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Pencil, CalendarDays } from 'lucide-react';
import * as barberService from '@/features/barbers/services/barberService';
import { BarberForm } from '@/features/barbers/pages/BarberFormPage';
import { useAuth } from '@/shared/contexts/AuthContext';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import SuccessToast from '@/shared/components/SuccessToast';

export default function BarbersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [barbers, setBarbers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
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
      const data = await barberService.getBarbers({
        active: showInactive ? 'false' : undefined,
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
  }, [showInactive]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchBarbers();
  };

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
    <div className="page-shell">
      <PageHeader
        title={isFormOpen ? formHeaderTitle : null}
        subtitle={isFormOpen ? formHeaderSubtitle : null}
        actions={
          isAdmin && !isFormOpen ? (
            <button
              type="button"
              onClick={() => setFormView('create')}
              className="btn-admin inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              Nuevo barbero
            </button>
          ) : null
        }
      />

      {inlineForm}

      {!isFormOpen && (
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0 max-w-xl">
          <input
            type="text"
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
            placeholder="Filtrar por documento (tipo o número)…"
            className="input-premium flex-1 py-2.5 text-sm min-w-0"
          />
          <button type="submit" className="btn-admin shrink-0">
            Filtrar
          </button>
        </form>
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
      </div>
      )}

      {!isFormOpen && error && (
        <div className="alert-error" role="alert">{error}</div>
      )}

      {!isFormOpen && loading ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">Cargando...</div>
        </DataCard>
      ) : !isFormOpen && barbers.length === 0 ? (
        <DataCard>
          <div className="py-16 text-center text-stone-500">No hay barberos registrados.</div>
        </DataCard>
      ) : !isFormOpen ? (
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
            </DataCard>
          ))}
        </div>
      ) : null}
      {successToast}
    </div>
  );
}
