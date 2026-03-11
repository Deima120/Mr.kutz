/**
 * Página de listado de clientes
 * Admin: CRUD. Barber: solo consulta (ver datos).
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as clientService from '../../services/clientService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Consulta de clientes'}
        actions={
          isAdmin ? (
            <Link
              to="/clients/new"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              + Nuevo cliente
            </Link>
          ) : null
        }
      />

      <DataCard>
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
          >
            Buscar
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-500">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
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
                        className="font-medium text-primary-600 hover:text-primary-700"
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
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver
                        </Link>
                        {isAdmin && (
                          <>
                            <Link
                              to={`/clients/${client.id}/edit`}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                Total: {total} cliente{total !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </DataCard>
    </div>
  );
}
