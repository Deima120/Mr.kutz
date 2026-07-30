/**
 * Secciones del módulo Reportes (orden Fase 3).
 * status: ready | pending
 */

export const REPORT_SECTIONS = [
  {
    id: 'summary',
    label: 'Resumen',
    description: 'KPIs del periodo',
    status: 'ready',
  },
  {
    id: 'sales',
    label: 'Historial de Ventas',
    description: 'Cobros del periodo',
    status: 'ready',
  },
  {
    id: 'cash',
    label: 'Historial de Caja',
    description: 'Aperturas y cierres',
    status: 'ready',
  },
  {
    id: 'inventory',
    label: 'Reporte de Inventario',
    description: 'Stock y valorización',
    status: 'ready',
  },
  {
    id: 'expenses',
    label: 'Historial de Gastos',
    description: 'Gastos operativos',
    status: 'ready',
  },
  {
    id: 'other-incomes',
    label: 'Historial de Otros Ingresos',
    description: 'Ingresos fuera de ventas',
    status: 'ready',
  },
  {
    id: 'commissions',
    label: 'Historial de Comisiones',
    description: 'Comisiones por barbero',
    status: 'ready',
  },
  {
    id: 'portfolio',
    label: 'Reporte de Cartera',
    description: 'Citas completadas sin cobro',
    status: 'ready',
  },
];

export function resolveReportSectionId(raw) {
  const id = String(raw || '').trim();
  if (REPORT_SECTIONS.some((s) => s.id === id)) return id;
  return 'summary';
}
