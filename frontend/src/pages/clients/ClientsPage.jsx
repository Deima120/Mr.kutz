/**
 * Página de listado de clientes
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as clientService from '../../services/clientService';

export default function ClientsPage() {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Clientes</h2>
        <Link
          to="/clients/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          + Nuevo cliente
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-100 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
          >
            Buscar
          </button>
        </form>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay clientes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{client.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/clients/${client.id}/edit`}
                          className="text-sm text-primary-600 hover:text-primary-700"
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
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
            Total: {total} cliente{total !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
