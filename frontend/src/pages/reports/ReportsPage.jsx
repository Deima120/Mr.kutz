/**
 * Reportes para admin - Estadísticas por periodo y exportación
 */

import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import * as dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/admin/PageHeader';
import StatsCard from '../../components/admin/StatsCard';
import DataCard from '../../components/admin/DataCard';

export default function ReportsPage() {
  const { businessName } = useSettings();
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
      setStats(Array.isArray(data) ? null : (data?.data ?? data));
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (!stats) return;
    const lines = [
      `Reporte ${businessName}`,
      `Periodo,${dateFrom},${dateTo}`,
      '',
      'Resumen',
      `Ventas totales,$${parseFloat(stats.sales?.total || 0).toFixed(2)}`,
      `Transacciones,${stats.sales?.count ?? 0}`,
      `Citas completadas,${stats.appointments?.completed ?? 0}`,
      `Citas pendientes,${stats.appointments?.pending ?? 0}`,
      `Clientes totales,${stats.totalClients ?? 0}`,
      '',
      'Servicios más solicitados',
      ...(stats.topServices || []).map((s) => `${s.name},${s.count}`),
      '',
      'Barberos más activos',
      ...(stats.topBarbers || []).map((b) => `${b.first_name} ${b.last_name},${b.count}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-mrkutz-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-stone-500">
          {loading ? 'Cargando reportes...' : 'Error al cargar datos'}
        </div>
      </div>
    );
  }

  const formatAmount = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Reportes"
        label="Análisis"
        subtitle="Estadísticas e ingresos por periodo"
        actions={
          <div className="flex flex-wrap gap-2 items-center no-print">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            <span className="text-stone-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-admin"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-admin-outline"
            >
              Imprimir
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Ventas totales"
          value={formatAmount(stats.sales?.total)}
          sublabel={`${stats.sales?.count || 0} transacciones`}
          variant="primary"
        />
        <StatsCard
          label="Citas completadas"
          value={stats.appointments?.completed ?? 0}
          sublabel={`${stats.appointments?.pending ?? 0} pendientes`}
        />
        <StatsCard label="Clientes totales" value={stats.totalClients ?? 0} />
        <StatsCard label="Stock bajo" value={stats.lowStockCount ?? 0} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DataCard title="Servicios más solicitados">
          {stats.topServices?.length > 0 ? (
            <ul className="space-y-3">
              {stats.topServices.map((s, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-stone-700">{s.name}</span>
                  <span className="font-semibold text-gold">{s.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 text-sm">Sin datos en el periodo</p>
          )}
        </DataCard>
        <DataCard title="Barberos más activos">
          {stats.topBarbers?.length > 0 ? (
            <ul className="space-y-3">
              {stats.topBarbers.map((b, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-stone-700">
                    {b.first_name} {b.last_name}
                  </span>
                  <span className="font-semibold text-gold">{b.count} citas</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500 text-sm">Sin datos en el periodo</p>
          )}
        </DataCard>
      </div>
    </div>
  );
}
