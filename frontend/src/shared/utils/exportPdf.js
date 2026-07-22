/**
 * Exportación PDF estructurada con diseño Mr. Kutz (jsPDF + autoTable).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from '@/shared/utils/money';

const BRAND = {
  gold: [201, 169, 98],
  dark: [12, 10, 9],
  headerBg: [28, 25, 23],
  textMuted: [120, 113, 108],
  zebra: [250, 250, 249],
  white: [255, 255, 255],
};

export function formatPdfExportDate() {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
}

export function pdfFileDateSuffix() {
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

function drawPdfHeader(doc, { title, subtitle = '', meta = [] }) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 34, 'F');

  doc.setTextColor(...BRAND.gold);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('MR. KUTZ · BARBERSHOP', 14, 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(214, 211, 209);
  const generated = `Generado: ${formatPdfExportDate()} (hora Colombia)`;
  doc.text(generated, 14, 26);

  let y = 38;
  if (subtitle) {
    doc.setTextColor(...BRAND.textMuted);
    doc.setFontSize(9);
    doc.text(subtitle, 14, y);
    y += 5;
  }
  meta.filter(Boolean).forEach((line) => {
    doc.setTextColor(...BRAND.textMuted);
    doc.setFontSize(8);
    doc.text(String(line), 14, y);
    y += 4;
  });

  return y + 2;
}

function drawPdfFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.gold);
    doc.setLineWidth(0.4);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textMuted);
    doc.text('Documento generado por el panel Mr. Kutz · Uso interno', 14, pageH - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, pageH - 8, { align: 'right' });
  }
}

/**
 * @param {object} opts
 * @param {string} opts.filename
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {string[]} [opts.meta]
 * @param {{ header: string, key?: string, accessor?: Function, align?: 'left'|'center'|'right' }[]} opts.columns
 * @param {object[]} opts.rows
 * @param {'portrait'|'landscape'} [opts.orientation]
 */
export function downloadTablePDF({
  filename,
  title,
  subtitle = '',
  meta = [],
  columns,
  rows,
  orientation = 'portrait',
}) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (!Array.isArray(columns) || columns.length === 0) return false;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const startY = drawPdfHeader(doc, { title, subtitle, meta });

  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) => columns.map((col) => cellValue(row, col)));
  const columnStyles = {};
  columns.forEach((col, index) => {
    if (col.align) columnStyles[index] = { halign: col.align };
  });

  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [231, 229, 228],
      lineWidth: 0.1,
      textColor: [41, 37, 36],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: BRAND.headerBg,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: BRAND.zebra },
    columnStyles,
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BRAND.dark);
        doc.text(title, 14, 12);
      }
    },
  });

  drawPdfFooter(doc);
  doc.save(filename);
  return true;
}

/**
 * Reporte administrativo con resumen, comparativa y tablas auxiliares.
 */
export function downloadReportPDF(report, { businessName = 'Mr. Kutz', dateFrom, dateTo } = {}) {
  if (!report) return false;

  const c = report.current || {};
  const p = report.previous || {};
  const cmp = report.comparison || {};
  const r = report.ratings || {};
  const dist = r.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const formatTrend = (value) => {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const arrow = n > 0 ? '▲' : n < 0 ? '▼' : '•';
    return `${arrow} ${Math.abs(n).toFixed(1).replace('.0', '')}%`;
  };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawPdfHeader(doc, {
    title: `Reporte · ${businessName}`,
    subtitle: `Periodo: ${dateFrom} — ${dateTo}`,
    meta: [`Comparado con el periodo anterior de igual duración`],
  });

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Periodo actual', 'Periodo anterior', 'Variación']],
    body: [
      ['Ventas totales', formatMoney(c.sales?.total), formatMoney(p.sales?.total), formatTrend(cmp.salesTotal)],
      ['Transacciones', String(c.sales?.count ?? 0), String(p.sales?.count ?? 0), formatTrend(cmp.salesCount)],
      ['Citas completadas', String(c.appointments?.completed ?? 0), String(p.appointments?.completed ?? 0), formatTrend(cmp.appointmentsCompleted)],
      ['Citas totales', String(c.appointments?.total ?? 0), String(p.appointments?.total ?? 0), formatTrend(cmp.appointmentsTotal)],
      ['Clientes totales', String(c.totalClients ?? 0), String(p.totalClients ?? 0), '—'],
      ['Productos stock bajo', String(c.lowStockCount ?? 0), '—', '—'],
      ['Valor inventario (costo)', formatMoney(c.inventoryValue ?? 0), '—', '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BRAND.zebra },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 8;

  const topServices = (c.topServices || []).map((s) => [s.name, `${s.count} citas`]);
  if (topServices.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.dark);
    doc.text('Servicios más solicitados', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Servicio', 'Citas']],
      body: topServices,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const topBarbers = (c.topBarbers || []).map((b) => [
    `${b.first_name || ''} ${b.last_name || ''}`.trim(),
    `${b.count} citas`,
  ]);
  if (topBarbers.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Barberos más activos', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Barbero', 'Citas']],
      body: topBarbers,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if ((c.lowStockAlerts || []).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Alertas de stock bajo', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Producto', 'Stock', 'Mínimo']],
      body: c.lowStockAlerts.map((item) => [
        item.name,
        String(item.quantity ?? 0),
        String(item.min_stock ?? item.minStock ?? 0),
      ]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Valoraciones del periodo', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.textMuted);
  const ratingSummary =
    r.count > 0
      ? `${r.count} reseña(s) · promedio ${r.average?.toFixed(2) ?? '—'}/5`
      : 'Sin valoraciones en el periodo';
  doc.text(ratingSummary, 14, y);
  y += 4;

  if (r.count > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Estrellas', 'Cantidad']],
      body: [5, 4, 3, 2, 1].map((stars) => [String(stars), String(dist[stars] || 0)]),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white },
      margin: { left: 14, right: 80 },
    });
    y = doc.lastAutoTable.finalY + 4;

    const recent = (r.recent || []).slice(0, 12);
    if (recent.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Cliente', 'Servicio', 'Barbero', '★', 'Comentario']],
        body: recent.map((x) => [
          x.date ? new Date(x.date).toLocaleDateString('es-CO') : '—',
          x.clientName || '—',
          x.serviceName || '—',
          x.barberName || '—',
          String(x.rating ?? '—'),
          (x.comment || '—').slice(0, 120),
        ]),
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: BRAND.headerBg, textColor: BRAND.white },
        margin: { left: 14, right: 14 },
      });
    }
  }

  drawPdfFooter(doc);
  doc.save(`reporte-mrkutz-${dateFrom}-${dateTo}.pdf`);
  return true;
}
