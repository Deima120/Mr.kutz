/**
 * Exportación Excel (.xls) con diseño Mr. Kutz — HTML + estilos (sin dependencias extra).
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatExcelExportDate() {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
}

export function excelFileDateSuffix() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
  }).format(new Date());
}

function cellValue(row, column) {
  const raw = typeof column.accessor === 'function'
    ? column.accessor(row)
    : row[column.key];
  if (raw == null || raw === '') return '—';
  return String(raw);
}

function buildDataRows(columns, rows) {
  return rows
    .map((row, index) => {
      const zebra = index % 2 === 0 ? '#fafaf9' : '#ffffff';
      const cells = columns
        .map((col) => {
          const align = col.align === 'right' ? 'text-align:right;' : col.align === 'center' ? 'text-align:center;' : '';
          const weight = col.emphasis ? 'font-weight:600;' : '';
          return `<td style="padding:8px 10px;border:1px solid #e7e5e4;${align}${weight}">${escapeHtml(cellValue(row, col))}</td>`;
        })
        .join('');
      return `<tr style="background:${zebra};">${cells}</tr>`;
    })
    .join('');
}

function buildHeaderRow(columns) {
  return columns
    .map((col) => {
      const align = col.align === 'right' ? 'text-align:right;' : col.align === 'center' ? 'text-align:center;' : '';
      return `<td style="padding:10px;border:1px solid #292524;${align}">${escapeHtml(col.header)}</td>`;
    })
    .join('');
}

function buildMetaHtml(meta) {
  return meta
    .filter(Boolean)
    .map((line) => `<div style="color:#a8a29e;font-size:11px;margin-top:2px;">${escapeHtml(line)}</div>`)
    .join('');
}

function buildTableBlock({ title, columns, rows, meta = [] }) {
  if (!columns?.length || !rows?.length) return '';
  const colSpan = columns.length;
  return `
  <tr><td colspan="${colSpan}" style="height:12px;border:none;"></td></tr>
  <tr><td colspan="${colSpan}" style="background:#fafaf9;padding:10px 14px;border:1px solid #e7e5e4;">
    <div style="font-size:13px;font-weight:bold;color:#1c1917;">${escapeHtml(title)}</div>
    ${buildMetaHtml(meta)}
  </td></tr>
  <tr style="background:#1c1917;color:#fafaf9;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
    ${buildHeaderRow(columns)}
  </tr>
  ${buildDataRows(columns, rows)}`;
}

/**
 * @param {object} opts
 * @param {string} opts.sheetName
 * @param {string} opts.title
 * @param {string[]} [opts.meta]
 * @param {{ header: string, key?: string, accessor?: Function, align?: string, emphasis?: boolean }[]} opts.columns
 * @param {object[]} opts.rows
 * @param {string} opts.fileBase — prefijo del archivo sin extensión
 */
export function downloadExcelTable({
  sheetName,
  title,
  meta = [],
  columns,
  rows,
  fileBase,
}) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (!Array.isArray(columns) || columns.length === 0) return false;

  const generatedAt = formatExcelExportDate();
  const colSpan = columns.length;
  const fileDate = excelFileDateSuffix();
  const safeSheet = String(sheetName || 'Datos').slice(0, 31);

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(safeSheet)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
  .title { font-size: 22px; font-weight: bold; color: #c9a962; }
  .brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #78716c; }
</style>
</head>
<body>
<table>
  <tr><td colspan="${colSpan}" style="background:#0c0a09;padding:16px 18px;border:1px solid #1c1917;">
    <div class="brand">Mr. Kutz · BarberShop</div>
    <div class="title" style="margin-top:4px;">${escapeHtml(title)}</div>
    <div style="color:#d6d3d1;font-size:11px;margin-top:6px;">Generado: ${escapeHtml(generatedAt)} (hora Colombia)</div>
    ${buildMetaHtml(meta)}
  </td></tr>
  <tr><td colspan="${colSpan}" style="height:8px;border:none;"></td></tr>
  <tr style="background:#1c1917;color:#fafaf9;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
    ${buildHeaderRow(columns)}
  </tr>
  ${buildDataRows(columns, rows)}
  <tr><td colspan="${colSpan}" style="padding:12px 10px;font-size:10px;color:#78716c;border-top:2px solid #c9a962;">
    Documento generado por el panel Mr. Kutz · Uso interno
  </td></tr>
</table>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileBase}-${fileDate}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Reporte administrativo en Excel con varias secciones en una hoja.
 */
export function downloadReportExcel(report, { businessName = 'Mr. Kutz', dateFrom, dateTo } = {}) {
  if (!report) return false;

  const c = report.current || {};
  const p = report.previous || {};
  const cmp = report.comparison || {};
  const r = report.ratings || {};
  const dist = r.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const formatAmount = (n) =>
    `$${Math.round(parseFloat(n || 0)).toLocaleString('es-CO')}`;

  const formatTrend = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '•';
    return `${arrow} ${Math.abs(n).toFixed(1).replace('.0', '')}%`;
  };

  const summaryRows = [
    { indicador: 'Ventas totales', actual: formatAmount(c.sales?.total), anterior: formatAmount(p.sales?.total), variacion: formatTrend(cmp.salesTotal) },
    { indicador: 'Transacciones', actual: String(c.sales?.count ?? 0), anterior: String(p.sales?.count ?? 0), variacion: formatTrend(cmp.salesCount) },
    { indicador: 'Citas completadas', actual: String(c.appointments?.completed ?? 0), anterior: String(p.appointments?.completed ?? 0), variacion: formatTrend(cmp.appointmentsCompleted) },
    { indicador: 'Citas totales', actual: String(c.appointments?.total ?? 0), anterior: String(p.appointments?.total ?? 0), variacion: formatTrend(cmp.appointmentsTotal) },
    { indicador: 'Clientes totales', actual: String(c.totalClients ?? 0), anterior: String(p.totalClients ?? 0), variacion: '—' },
    { indicador: 'Productos stock bajo', actual: String(c.lowStockCount ?? 0), anterior: '—', variacion: '—' },
    { indicador: 'Valor inventario (costo)', actual: formatAmount(c.inventoryValue ?? 0), anterior: '—', variacion: '—' },
  ];

  const summaryCols = [
    { header: 'Indicador', key: 'indicador', emphasis: true },
    { header: 'Periodo actual', key: 'actual', align: 'right' },
    { header: 'Periodo anterior', key: 'anterior', align: 'right' },
    { header: 'Variación', key: 'variacion', align: 'center' },
  ];

  const maxCols = 6;
  const generatedAt = formatExcelExportDate();
  const fileDate = excelFileDateSuffix();

  let body = `
  <tr><td colspan="${maxCols}" style="background:#0c0a09;padding:16px 18px;border:1px solid #1c1917;">
    <div class="brand">Mr. Kutz · BarberShop</div>
    <div class="title" style="margin-top:4px;">Reporte · ${escapeHtml(businessName)}</div>
    <div style="color:#d6d3d1;font-size:11px;margin-top:6px;">Generado: ${escapeHtml(generatedAt)} (hora Colombia)</div>
    <div style="color:#a8a29e;font-size:11px;margin-top:2px;">Periodo: ${escapeHtml(dateFrom)} — ${escapeHtml(dateTo)}</div>
    <div style="color:#a8a29e;font-size:11px;margin-top:2px;">Comparado con el periodo anterior de igual duración</div>
  </td></tr>
  ${buildTableBlock({ title: 'Resumen', columns: summaryCols, rows: summaryRows })}`;

  if ((c.topServices || []).length > 0) {
    body += buildTableBlock({
      title: 'Servicios más solicitados',
      columns: [
        { header: 'Servicio', key: 'name', emphasis: true },
        { header: 'Citas', key: 'count', align: 'right' },
      ],
      rows: c.topServices.map((s) => ({ name: s.name, count: s.count })),
    });
  }

  if ((c.topBarbers || []).length > 0) {
    body += buildTableBlock({
      title: 'Barberos más activos',
      columns: [
        { header: 'Barbero', key: 'name', emphasis: true },
        { header: 'Citas', key: 'count', align: 'right' },
      ],
      rows: c.topBarbers.map((b) => ({
        name: `${b.first_name || ''} ${b.last_name || ''}`.trim(),
        count: b.count,
      })),
    });
  }

  if ((c.lowStockAlerts || []).length > 0) {
    body += buildTableBlock({
      title: 'Alertas de stock bajo',
      columns: [
        { header: 'Producto', key: 'name', emphasis: true },
        { header: 'Stock', key: 'stock', align: 'right' },
        { header: 'Mínimo', key: 'min', align: 'right' },
      ],
      rows: c.lowStockAlerts.map((item) => ({
        name: item.name,
        stock: item.quantity ?? 0,
        min: item.min_stock ?? item.minStock ?? 0,
      })),
    });
  }

  const ratingRows = [5, 4, 3, 2, 1].map((stars) => ({
    estrellas: stars,
    cantidad: dist[stars] || 0,
  }));

  body += buildTableBlock({
    title: 'Valoraciones del periodo',
    meta: [
      r.count > 0
        ? `${r.count} reseña(s) · promedio ${r.average?.toFixed(2) ?? '—'}/5`
        : 'Sin valoraciones en el periodo',
    ],
    columns: [
      { header: 'Estrellas', key: 'estrellas', align: 'center' },
      { header: 'Cantidad', key: 'cantidad', align: 'right' },
    ],
    rows: ratingRows,
  });

  const recent = (r.recent || []).slice(0, 50);
  if (recent.length > 0) {
    body += buildTableBlock({
      title: 'Reseñas recientes',
      columns: [
        { header: 'Fecha', accessor: (x) => (x.date ? new Date(x.date).toLocaleDateString('es-CO') : '—') },
        { header: 'Cliente', key: 'clientName', emphasis: true },
        { header: 'Servicio', key: 'serviceName' },
        { header: 'Barbero', key: 'barberName' },
        { header: '★', key: 'rating', align: 'center' },
        { header: 'Comentario', accessor: (x) => (x.comment || '—').slice(0, 200) },
      ],
      rows: recent,
    });
  }

  body += `<tr><td colspan="${maxCols}" style="padding:12px 10px;font-size:10px;color:#78716c;border-top:2px solid #c9a962;">
    Documento generado por el panel Mr. Kutz · Uso interno
  </td></tr>`;

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Reporte</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
  .title { font-size: 22px; font-weight: bold; color: #c9a962; }
  .brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #78716c; }
</style>
</head>
<body>
<table>${body}</table>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-mrkutz-${dateFrom}-${dateTo}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
