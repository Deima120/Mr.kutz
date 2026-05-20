import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Eye, Edit2, Trash2, Search, Scissors } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as clientService from '@/features/clients/services/clientService';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import { downloadCSV, printAsPDF } from '@/shared/utils/export';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Estados de confirmación de eliminación premium
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name } o null
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const location = useLocation();

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchClients = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const data = await clientService.getClients({
        search: search.trim() || undefined,
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
  };

  // Cargar clientes al cambiar la página o el tamaño de página
  useEffect(() => {
    fetchClients();
  }, [page, pageSize]);

  // Restablecer la página a 1 si cambian los parámetros principales
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
    } else {
      fetchClients(1);
    }
  };

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
            <form onSubmit={handleSearch} className="flex gap-3 max-w-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, documento o correo..."
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none text-sm shadow-sm transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-stone-900 text-gold hover:text-gold-light border border-stone-850 hover:border-gold/40 font-semibold rounded-xl shadow-sm transition-all duration-200 transform active:scale-95 text-sm shrink-0"
              >
                Buscar
              </button>
            </form>
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
                  <div className="mt-6 pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-xs sm:text-sm text-stone-500 font-bold">
                      Mostrando {clients.length} de {total} cliente{total !== 1 ? 's' : ''}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <label htmlFor="barber-page-size" className="text-xs font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                          Por página
                        </label>
                        <select
                          id="barber-page-size"
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 focus:border-gold focus:ring-2 focus:ring-gold/40 outline-none w-auto min-w-[4.5rem] font-medium"
                        >
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2" role="navigation" aria-label="Cambiar página">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Anterior
                        </button>
                        <span className="text-xs sm:text-sm font-bold text-stone-800 tabular-nums min-w-[2.75rem] text-center px-0.5">
                          {safePage}/{totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-stone-900 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
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
      <PageHeader
        compact={true}
        title="Clientes"
        label="Consulta"
        subtitle={total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Consulta de clientes'}
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCSV('clientes.csv', clients.map((c) => ({
                  id: c.id,
                  nombre: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                  email: c.email || '',
                  telefono: c.phone || '',
                  documento_tipo: c.document_type || '',
                  documento_numero: c.document_number || '',
                })))}
                className="btn-admin-outline hover:text-gold hover:bg-stone-100 transition-colors text-xs font-semibold py-2 px-3 sm:text-sm"
              >
                Exportar CSV
              </button>
              <button 
                type="button" 
                onClick={printAsPDF} 
                className="btn-admin-outline hover:text-gold hover:bg-stone-100 transition-colors text-xs font-semibold py-2 px-3 sm:text-sm"
              >
                Exportar PDF
              </button>
              <Link to="/clients/new" className="btn-admin text-xs font-semibold py-2 px-4 sm:text-sm">
                + Nuevo cliente
              </Link>
            </div>
          ) : null
        }
      />

      <DataCard>
        {/* Formulario de Búsqueda Unificado */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, documento o correo..."
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none text-sm shadow-sm transition-all duration-200"
            />
          </div>
          <button 
            type="submit" 
            className="btn-admin shrink-0 px-6 font-semibold rounded-xl text-sm transition-transform active:scale-95 duration-200"
          >
            Buscar
          </button>
        </form>

        {error && (
          <div className="mb-4 alert-error text-sm py-2.5" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-stone-500">
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
                        <div className="flex gap-1.5">
                          <Link
                            to={`/clients/${client.id}`}
                            title="Ver cliente"
                            className="p-1.5 text-stone-800 hover:text-gold-dark hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-150"
                          >
                            <Eye className="w-4.5 h-4.5" strokeWidth={2.5} />
                          </Link>
                          <Link
                            to={`/clients/${client.id}/edit`}
                            title="Editar cliente"
                            className="p-1.5 text-stone-700 hover:text-gold-dark hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-150"
                          >
                            <Edit2 className="w-4.5 h-4.5" strokeWidth={2.5} />
                          </Link>
                          <button
                            onClick={() =>
                              handleDelete(
                                client.id,
                                `${client.first_name} ${client.last_name}`
                              )
                            }
                            title="Eliminar cliente"
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                          >
                            <Trash2 className="w-4.5 h-4.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación Vista Admin */}
            {total > 0 && (
              <div className="mt-6 pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-xs sm:text-sm text-stone-500 font-bold">
                  Mostrando {clients.length} de {total} cliente{total !== 1 ? 's' : ''}
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="admin-page-size" className="text-xs font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">
                      Por página
                    </label>
                    <select
                      id="admin-page-size"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-stone-900 focus:border-gold focus:ring-2 focus:ring-gold/40 outline-none w-auto min-w-[4.5rem] font-medium"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2" role="navigation" aria-label="Cambiar página">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Anterior
                    </button>
                    <span className="text-xs sm:text-sm font-bold text-stone-800 tabular-nums min-w-[2.75rem] text-center px-0.5">
                      {safePage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-stone-900 shadow-sm transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DataCard>

      {/* Modal de Confirmación de Eliminación Premium */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 max-w-sm w-full animate-fade-in-up duration-300 relative overflow-hidden">
            {/* Adorno sutil gradiente */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500"></div>

            <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>

            <h3 className="font-serif text-lg font-bold text-stone-900 text-center mb-2">
              ¿Eliminar cliente?
            </h3>
            
            <p className="text-stone-500 text-xs sm:text-sm text-center leading-relaxed mb-6">
              ¿Estás seguro de que deseas eliminar permanentemente el expediente de{' '}
              <strong className="text-stone-850 font-bold">{deleteTarget.name}</strong>? 
              Esta acción no se puede deshacer y retirará toda su información.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 font-bold rounded-xl text-sm transition-all border border-stone-200/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 duration-200 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    Eliminando...
                  </>
                ) : (
                  'Sí, eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Éxito Premium */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-stone-900 border border-gold/45 text-white px-4.5 py-3.5 rounded-xl shadow-2xl animate-fade-in-up transition-all duration-300 max-w-sm">
          <div className="w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <span className="text-sm font-bold">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium pr-6">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="absolute top-2.5 right-2.5 text-stone-400 hover:text-gold transition-colors text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}


