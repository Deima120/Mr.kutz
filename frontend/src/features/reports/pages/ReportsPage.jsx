/**
 * Reportes para admin — Resumen, comparativa con periodo anterior y reseñas.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@/shared/contexts/SettingsContext';
import * as dashboardService from '@/features/dashboard/services/dashboardService';
import PageHeader from '@/shared/components/admin/PageHeader';
import StatsCard from '@/shared/components/admin/StatsCard';
import DataCard from '@/shared/components/admin/DataCard';

const formatAmount = (n) =>
  `$${Math.round(parseFloat(n || 0)).toLocaleString('es-CO')}`;

function TrendBadge({ value, positiveIsGood = true }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className="text-xs text-stone-400">sin dato previo</span>;
  }
  const n = Number(value);
  const neutral = n === 0;
  const good = (n > 0 && positiveIsGood) || (n < 0 && !positiveIsGood);
  const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '•';
  const tone = neutral
    ? 'bg-stone-100 text-stone-600'
    : good
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-red-50 text-red-700 border-red-100';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tone}`}
    >
      <span aria-hidden>{arrow}</span>
      {Math.abs(n).toFixed(1).replace('.0', '')}%
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return String(iso).slice(0, 10);
  }
}

export default function ReportsPage() {
  const { businessName } = useSettings();
  const [report, setReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardService.getReport({ dateFrom, dateTo });
      setReport(Array.isArray(data) ? null : data);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el reporte');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!report) return;
    const c = report.current || {};
    const p = report.previous || {};
    const cmp = report.comparison || {};
    const r = report.ratings || {};
    const esc = (s) => {
      const v = String(s ?? '');
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const lines = [
      `Reporte ${businessName || 'Mr. Kutz'}`,
      `Periodo,${dateFrom},${dateTo}`,
      '',
      'Concepto,Actual,Anterior,Variación %',
      `Ventas totales,${c.sales?.total ?? 0},${p.sales?.total ?? 0},${cmp.salesTotal ?? ''}`,
      `Transacciones,${c.sales?.count ?? 0},${p.sales?.count ?? 0},${cmp.salesCount ?? ''}`,
      `Citas completadas,${c.appointments?.completed ?? 0},${p.appointments?.completed ?? 0},${cmp.appointmentsCompleted ?? ''}`,
      `Citas totales,${c.appointments?.total ?? 0},${p.appointments?.total ?? 0},${cmp.appointmentsTotal ?? ''}`,
      `Clientes totales,${c.totalClients ?? 0},${p.totalClients ?? 0},`,
      '',
      'Servicios más solicitados',
      ...(c.topServices || []).map((s) => `${esc(s.name)},${s.count}`),
      '',
      'Barberos más activos',
      ...(c.topBarbers || []).map((b) => `${esc(`${b.first_name} ${b.last_name}`)},${b.count}`),
      '',
      'Reseñas del periodo',
      `Promedio,${r.average ?? ''}`,
      `Total,${r.count ?? 0}`,
      'Fecha,Cliente,Servicio,Barbero,Puntaje,Comentario',
      ...(r.recent || []).map((x) =>
        [
          esc(formatDate(x.date)),
          esc(x.clientName),
          esc(x.serviceName),
          esc(x.barberName),
          esc(x.rating),
          esc(x.comment || ''),
        ].join(',')
      ),
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

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-stone-500">
          {loading ? 'Cargando reportes...' : error || 'Error al cargar datos'}
        </div>
      </div>
    );
  }

  const c = report.current || {};
  const cmp = report.comparison || {};
  const r = report.ratings || {};
  const dist = r.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const maxBar = Math.max(1, dist[1], dist[2], dist[3], dist[4], dist[5]);

  return (
    <div className="page-shell print:space-y-4">
      <PageHeader
        title="Reportes"
        label="Análisis"
        subtitle="Resumen, comparativa con el periodo anterior y valoraciones."
        actions={
          <div className="flex flex-wrap gap-2 items-center no-print">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            <span className="text-stone-400 hidden sm:inline">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-admin flex-1 sm:flex-none"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-admin-outline flex-1 sm:flex-none"
            >
              Imprimir
            </button>
          </div>
        }
      />

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Ventas totales"
          value={formatAmount(c.sales?.total)}
          sublabel={
            <span className="inline-flex items-center gap-2">
              {`${c.sales?.count || 0} transacciones`}
              <TrendBadge value={cmp.salesTotal} />
            </span>
          }
          variant="primary"
        />
        <StatsCard
          label="Citas completadas"
          value={c.appointments?.completed ?? 0}
          sublabel={
            <span className="inline-flex items-center gap-2">
              {`${c.appointments?.pending ?? 0} pendientes`}
              <TrendBadge value={cmp.appointmentsCompleted} />
            </span>
          }
        />
        <StatsCard
          label="Citas totales"
          value={c.appointments?.total ?? 0}
          sublabel={<TrendBadge value={cmp.appointmentsTotal} />}
        />
        <StatsCard label="Stock bajo" value={c.lowStockCount ?? 0} positiveIsGood={false} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DataCard title="Servicios más solicitados">
          {c.topServices?.length > 0 ? (
            <ul className="space-y-3">
              {c.topServices.map((s, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center text-sm"
                >
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
          {c.topBarbers?.length > 0 ? (
            <ul className="space-y-3">
              {c.topBarbers.map((b, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center text-sm"
                >
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

      <DataCard
        title="Valoraciones del periodo"
        subtitle={
          r.count > 0
            ? `${r.count} reseña${r.count === 1 ? '' : 's'} · promedio ${r.average?.toFixed(2) ?? '—'}/5`
            : 'Aún no hay valoraciones recibidas'
        }
      >
        {r.count > 0 ? (
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const n = dist[stars] || 0;
                const w = Math.round((n / maxBar) * 100);
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-stone-500">{stars} ★</span>
                    <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gold"
                        style={{ width: `${w}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-6 text-right text-stone-600">{n}</span>
                  </div>
                );
              })}
            </div>
            <ul className="space-y-3">
              {(r.recent || []).slice(0, 6).map((x) => (
                <li
                  key={x.appointmentId}
                  className="border border-stone-200 rounded-xl p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-stone-700 font-semibold">
                      {x.clientName}
                      <span className="text-stone-400 font-normal">
                        {x.serviceName ? ` · ${x.serviceName}` : ''}
                        {x.barberName ? ` · con ${x.barberName}` : ''}
                      </span>
                    </span>
                    <span className="text-gold font-semibold">
                      {'★'.repeat(x.rating)}{'☆'.repeat(5 - x.rating)}
                    </span>
                  </div>
                  {x.comment && (
                    <p className="text-stone-600">"{x.comment}"</p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">{formatDate(x.date)}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-stone-500 text-sm">
            Cuando marques citas como completadas, el cliente recibirá un correo
            para dejar su reseña y aparecerá aquí.
          </p>
        )}
      </DataCard>
    </div>
  );
}
