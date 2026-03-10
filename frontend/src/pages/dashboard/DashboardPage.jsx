/**
 * Dashboard administrativo - Estadísticas y métricas
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardService from '../../services/dashboardService';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getStats({ dateFrom, dateTo });
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  if (loading || !stats) {
    return (
      <div className="p-12 text-center text-gray-500">
        {loading ? 'Cargando...' : 'Error al cargar estadísticas'}
      </div>
    );
  }

  const formatAmount = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-primary-600 text-white rounded-xl p-6">
          <p className="text-primary-100 text-sm">Ventas</p>
          <p className="text-2xl font-bold mt-1">{formatAmount(stats.sales?.total)}</p>
          <p className="text-primary-200 text-sm">{stats.sales?.count || 0} transacciones</p>
        </div>
        <div className="bg-white rounded-xl border shadow p-6">
          <p className="text-gray-500 text-sm">Citas completadas</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {stats.appointments?.completed ?? 0}
          </p>
          <p className="text-gray-500 text-sm">
            {stats.appointments?.pending ?? 0} pendientes
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow p-6">
          <p className="text-gray-500 text-sm">Clientes totales</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalClients ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow p-6">
          <p className="text-gray-500 text-sm">Stock bajo</p>
          <p className="text-2xl font-bold mt-1">
            {stats.lowStockCount > 0 ? (
              <Link to="/inventory?lowStock=true" className="text-amber-600 hover:text-amber-700">
                {stats.lowStockCount} producto(s)
              </Link>
            ) : (
              <span className="text-green-600">0</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl border shadow p-6">
          <h3 className="font-medium text-gray-800 mb-4">Servicios más solicitados</h3>
          {stats.topServices?.length > 0 ? (
            <ul className="space-y-2">
              {stats.topServices.map((s, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-medium">{s.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Sin datos en el periodo</p>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow p-6">
          <h3 className="font-medium text-gray-800 mb-4">Barberos más activos</h3>
          {stats.topBarbers?.length > 0 ? (
            <ul className="space-y-2">
              {stats.topBarbers.map((b, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>
                    {b.first_name} {b.last_name}
                  </span>
                  <span className="font-medium">{b.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Sin datos en el periodo</p>
          )}
        </div>
      </div>
    </div>
  );
}
