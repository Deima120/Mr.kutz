import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Eye, Pencil, Trash2, Search, Plus } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as clientService from '@/features/clients/services/clientService';
import { ClientForm } from '@/features/clients/pages/ClientFormPage';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import { AdminPagination } from '@/shared/components/admin/AdminListControls';
import SuccessToast from '@/shared/components/SuccessToast';
import ClientDeleteModal from '@/features/clients/components/ClientDeleteModal';
import { downloadClientsExcel } from '@/features/clients/utils/exportClientsExcel';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const SEARCH_DEBOUNCE_MS = 350;

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Estados de confirmación de eliminación premium
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } o null
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const resolveFormViewFromPath = (pathname) => {
    if (pathname === '/clients/new') return 'create';
    const editMatch = pathname.match(/^\/clients\/(\d+)\/edit$/);
    if (editMatch) return parseInt(editMatch[1], 10);
    return null;
  };

  const [formView, setFormView] = useState(() => resolveFormViewFromPath(location.pathname));

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;

  useEffect(() => {
    const fromPath = resolveFormViewFromPath(location.pathname);
    if (fromPath != null) {
      setFormView(fromPath);
      navigate('/clients', { replace: true });
    }
  }, [location.pathname, navigate]);

  const fetchClients = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const data = await clientService.getClients({
        search: debouncedSearch || undefined,
        limit: pageSize,
        offset: (targetPage - 1) * pageSize,
      });
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err?.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  useEffect(() => {
    fetchClients(page);
  }, [fetchClients, page]);

  // Activar modal de eliminación
  const handleDelete = (id, name) => {
    setDeleteTarget({ id, name });
  };

  // Procesar eliminación real desde el modal
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await clientService.deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage(`Cliente "${deleteTarget.name}" eliminado correctamente.`);
      fetchClients();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = ({ created, updated } = {}) => {
    setFormView(null);
    if (created) setSuccessMessage('Cliente registrado correctamente.');
    if (updated) setSuccessMessage('Cliente actualizado correctamente.');
    fetchClients(1);
    setPage(1);
  };

  const openEditForm = (id) => setFormView(id);

  const handleExportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await clientService.getClients({
        search: debouncedSearch || undefined,
        limit: 10000,
        offset: 0,
      });
      const allClients = data.clients || [];
      if (allClients.length === 0) {
        setError('No hay clientes para exportar.');
        return;
      }
      downloadClientsExcel(allClients, { search: debouncedSearch });
    } catch (err) {
      setError(err?.message || 'Error al exportar clientes');
    } finally {
      setExporting(false);
    }
  };

  const inlineForm = isFormOpen ? (
    <ClientForm
      embedded
      editId={editingId}
      onSuccess={handleFormSuccess}
      onCancel={() => setFormView(null)}
    />
  ) : null;

  const dismissSuccessMessage = () => setSuccessMessage('');
  const successToast = <SuccessToast message={successMessage} onDismiss={dismissSuccessMessage} />;

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // Asegurar que la página no esté fuera de rango
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ——— Vista barbero: solo lectura, diseño premium ———
  if (isBarber) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div>
          <p className="section-label text-gold">Consulta</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1 animate-fade-in">
            Clientes
          </h1>
          <p className="text-stone-500">
            {total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}. Solo consulta.` : 'Busca y consulta datos de clientes.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="relative max-w-3xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o correo..."
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none text-sm shadow-sm transition-all duration-200"
                autoComplete="off"
                aria-label="Buscar clientes"
              />
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-stone-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gold border-t-transparent mb-2"></div>
                <p className="text-sm font-medium animate-pulse">Buscando expedientes...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Search className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                <p className="text-sm font-medium">No hay clientes que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {clients.map((client) => (
                    <li key={client.id} className="group">
                      <Link
                        to={`/clients/${client.id}`}
                        className="block p-4 rounded-xl border border-stone-200 hover:border-gold/30 hover:shadow-card-hover transition-all bg-stone-50/50 hover:bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-serif font-semibold text-stone-900 group-hover:text-gold-dark transition-colors duration-200">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-stone-500 text-xs mt-0.5 font-medium">{client.email || 'Sin email'}</p>
                            {client.phone && (
                              <p className="text-stone-500 text-xs font-medium">{client.phone}</p>
                            )}
                            <p className="text-stone-400 text-[11px] mt-1 font-bold">
                              Doc: {[client.document_type, client.document_number].filter(Boolean).join(' ') || '—'}
                            </p>
                          </div>
                          <span className="text-stone-800 text-xs font-bold inline-flex items-center gap-1 bg-stone-100 group-hover:bg-gold-muted group-hover:text-gold-dark border border-stone-200/50 rounded-lg px-2.5 py-1.5 transition-all">
                            Ver detalle
                            <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden />
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Paginación Vista Barbero */}
                {total > 0 && clients.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-stone-100">
                    <AdminPagination
                      idPrefix="clients-barber"
                      page={safePage}
                      pageSize={pageSize}
                      total={total}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      itemLabel={`cliente${total !== 1 ? 's' : ''}`}
                      showSummary
                      layout="bar"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Vista admin ———
  return (
    <div className="page-shell animate-fade-in-up">
      {isFormOpen ? (
        inlineForm
      ) : (
        <>
          <PageHeader
            filters={
              <div className="relative min-w-0 flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, documento o correo..."
                  className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none text-sm"
                  autoComplete="off"
                  aria-label="Buscar clientes"
                />
              </div>
            }
            actions={
              isAdmin ? (
                <div className="flex gap-2">
                  <AdminExportButtons
                    onExcel={handleExportExcel}
                    excelDisabled={exporting || total === 0}
                    excelLoading={exporting}
                  />
                  <button
                    type="button"
                    onClick={() => setFormView('create')}
                    className="btn-admin inline-flex items-center gap-2 text-xs font-semibold py-2 px-4 sm:text-sm"
                  >
                    <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    Nuevo cliente
                  </button>
                </div>
              ) : null
            }
          />

          <DataCard compact>
        {error && (
          <div className="mb-3 alert-error text-sm py-2" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-stone-500">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-gold border-t-transparent mb-2"></div>
            <p className="text-sm font-medium animate-pulse">Obteniendo listado de clientes...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-12 h-12 text-stone-200 mx-auto mb-2" />
            <p className="text-stone-500 text-sm font-medium">No hay clientes registrados en esta página.</p>
          </div>
        ) : (
          <>
            {total > 0 && (
              <AdminPagination
                idPrefix="clients-admin"
                page={safePage}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                itemLabel={`cliente${total !== 1 ? 's' : ''}`}
                showSummary
                layout="bar"
              />
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeader>Nombre</TableHeader>
                  <TableHeader>Documento</TableHeader>
                  <TableHeader>Correo</TableHeader>
                  <TableHeader>Teléfono</TableHeader>
                  <TableHeader>Acciones</TableHeader>
                </TableHead>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Link
                          to={`/clients/${client.id}`}
                          className="font-semibold text-stone-900 hover:text-gold-dark transition-colors duration-200"
                        >
                          {client.first_name} {client.last_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-stone-600 font-medium whitespace-nowrap">
                        {[client.document_type, client.document_number].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-stone-700">{client.email || '-'}</TableCell>
                      <TableCell className="text-xs font-semibold text-stone-700">{client.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5">
                          <AdminIconButton
                            icon={Eye}
                            label="Ver cliente"
                            to={`/clients/${client.id}`}
                          />
                          {isAdmin && (
                            <AdminIconButton
                              icon={Pencil}
                              label="Editar cliente"
                              onClick={() => openEditForm(client.id)}
                            />
                          )}
                          {isAdmin && (
                          <AdminIconButton
                            icon={Trash2}
                            label="Eliminar cliente"
                            variant="danger"
                            onClick={() =>
                              handleDelete(
                                client.id,
                                `${client.first_name} ${client.last_name}`
                              )
                            }
                          />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
          </DataCard>
        </>
      )}

      <ClientDeleteModal
        open={Boolean(deleteTarget)}
        clientName={deleteTarget?.name}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {successToast}
    </div>
  );
}


