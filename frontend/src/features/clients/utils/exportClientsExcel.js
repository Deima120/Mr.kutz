/**
 * Exporta clientes a Excel (.xls) con diseño Mr. Kutz (HTML + estilos).
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExportDate() {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
}

function buildRowsHtml(clients) {
  return clients
    .map((c, index) => {
      const zebra = index % 2 === 0 ? '#fafaf9' : '#ffffff';
      return `<tr style="background:${zebra};">
        <td style="padding:8px 10px;border:1px solid #e7e5e4;">${escapeHtml(c.id)}</td>
        <td style="padding:8px 10px;border:1px solid #e7e5e4;font-weight:600;">${escapeHtml(`${c.first_name || ''} ${c.last_name || ''}`.trim())}</td>
        <td style="padding:8px 10px;border:1px solid #e7e5e4;">${escapeHtml(c.document_type || '—')}</td>
        <td style="padding:8px 10px;border:1px solid #e7e5e4;">${escapeHtml(c.document_number || '—')}</td>
        <td style="padding:8px 10px;border:1px solid #e7e5e4;">${escapeHtml(c.email || '—')}</td>
        <td style="padding:8px 10px;border:1px solid #e7e5e4;">${escapeHtml(c.phone || '—')}</td>
      </tr>`;
    })
    .join('');
}

export function downloadClientsExcel(clients, { search = '' } = {}) {
  if (!Array.isArray(clients) || clients.length === 0) return false;

  const generatedAt = formatExportDate();
  const filterNote = search ? `Filtro: «${search}»` : 'Sin filtro de búsqueda';
  const fileDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
  }).format(new Date());

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Clientes</x:Name>
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
  <tr><td colspan="6" style="background:#0c0a09;padding:16px 18px;border:1px solid #1c1917;">
    <div class="brand">Mr. Kutz · BarberShop</div>
    <div class="title" style="margin-top:4px;">Listado de clientes</div>
    <div style="color:#d6d3d1;font-size:11px;margin-top:6px;">Generado: ${escapeHtml(generatedAt)} (hora Colombia)</div>
    <div style="color:#a8a29e;font-size:11px;margin-top:2px;">${escapeHtml(filterNote)} · Total: ${clients.length}</div>
  </td></tr>
  <tr><td colspan="6" style="height:8px;border:none;"></td></tr>
  <tr style="background:#1c1917;color:#fafaf9;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
    <td style="padding:10px;border:1px solid #292524;">ID</td>
    <td style="padding:10px;border:1px solid #292524;">Nombre completo</td>
    <td style="padding:10px;border:1px solid #292524;">Tipo doc.</td>
    <td style="padding:10px;border:1px solid #292524;">Número doc.</td>
    <td style="padding:10px;border:1px solid #292524;">Correo</td>
    <td style="padding:10px;border:1px solid #292524;">Teléfono</td>
  </tr>
  ${buildRowsHtml(clients)}
  <tr><td colspan="6" style="padding:12px 10px;font-size:10px;color:#78716c;border-top:2px solid #c9a962;">
    Documento generado por el panel Mr. Kutz · Uso interno
  </td></tr>
</table>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clientes-mrkutz-${fileDate}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
