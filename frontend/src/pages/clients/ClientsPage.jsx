/**
 * Página de listado de clientes
 * Admin: CRUD. Barber: solo consulta (ver datos) con diseño premium.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as clientService from '../../services/clientService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import { downloadCSV, printAsPDF } from '../../utils/export';

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isBarber = user?.role === 'barber';
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClients = async (searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const data = await clientService.getClients({ search: searchTerm || undefined });
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err?.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients(search);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar cliente "${name}"?`)) return;
    try {
      await clientService.deleteClient(id);
      fetchClients();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  // ——— Vista barbero: solo lectura, diseño premium ———
  if (isBarber) {
    return (
      <div className="space-y-8">
        <div>
          <p className="section-label text-gold">Consulta</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
            Clientes
          </h1>
          <p className="text-stone-500">
            {total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}. Solo consulta.` : 'Busca y consulta datos de clientes.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none text-sm"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal transition-colors text-sm"
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
              <div className="py-16 text-center text-stone-500">Cargando clientes...</div>
            ) : clients.length === 0 ? (
              <p className="text-stone-500 py-8 text-center">No hay clientes que coincidan con la búsqueda.</p>
            ) : (
              <ul className="space-y-3">
                {clients.map((client) => (
                  <li key={client.id}>
                    <Link
                      to={`/clients/${client.id}`}
                      className="block p-4 rounded-xl border border-stone-200 hover:border-gold/30 hover:shadow-card-hover transition-all bg-stone-50/50 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-serif font-medium text-stone-900">
                            {client.first_name} {client.last_name}
                          </p>
                          <p className="text-stone-500 text-sm mt-0.5">{client.email || 'Sin email'}</p>
                          {client.phone && (
                            <p className="text-stone-500 text-sm">{client.phone}</p>
                          )}
                        </div>
                        <span className="text-gold text-sm font-semibold">Ver detalle →</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {total > 0 && clients.length > 0 && (
              <p className="mt-4 pt-4 border-t border-stone-100 text-sm text-stone-500">
                Total: {total} cliente{total !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Vista admin ———
  return (
    <div className="page-shell">
      <PageHeader
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
                })))}
                className="btn-admin-outline"
              >
                Exportar CSV
              </button>
              <button type="button" onClick={printAsPDF} className="btn-admin-outline">
                Exportar PDF
              </button>
              <Link to="/clients/new" className="btn-admin">
                + Nuevo cliente
              </Link>
            </div>
          ) : null
        }
      />

      <DataCard>
        <form onSubmit={handleSearch} className="mb-4 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="input-premium flex-1 py-2.5 text-sm"
          />
          <button type="submit" className="btn-admin">
            Buscar
          </button>
        </form>

        {error && (
          <div className="mb-4 alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-stone-500">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            No hay clientes registrados.
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Nombre</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Teléfono</TableHeader>
                <TableHeader>Acciones</TableHeader>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-medium text-barber-dark hover:text-gold transition-colors"
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-3">
                        <Link
                          to={`/clients/${client.id}`}
                          className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                        >
                          Ver
                        </Link>
                        <Link
                          to={`/clients/${client.id}/edit`}
                          className="text-sm text-stone-700 hover:text-gold font-medium"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(
                              client.id,
                              `${client.first_name} ${client.last_name}`
                            )
                          }
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100 text-sm text-stone-500">
                Total: {total} cliente{total !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </DataCard>
    </div>
  );
}
