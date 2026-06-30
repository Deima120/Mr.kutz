/**
 * Exporta clientes a Excel (.xls) con diseño Mr. Kutz.
 */

import { downloadExcelTable } from '@/shared/utils/exportExcel';

export function downloadClientsExcel(clients, { search = '' } = {}) {
  if (!Array.isArray(clients) || clients.length === 0) return false;

  return downloadExcelTable({
    sheetName: 'Clientes',
    title: 'Listado de clientes',
    meta: [
      search ? `Filtro: «${search}»` : 'Sin filtro de búsqueda',
      `Total: ${clients.length}`,
    ],
    columns: [
      { header: 'ID', key: 'id', align: 'center' },
      {
        header: 'Nombre completo',
        accessor: (c) => `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        emphasis: true,
      },
      { header: 'Tipo doc.', key: 'document_type' },
      { header: 'Número doc.', key: 'document_number' },
      { header: 'Correo', key: 'email' },
      { header: 'Teléfono', key: 'phone' },
    ],
    rows: clients,
    fileBase: 'clientes-mrkutz',
  });
}
