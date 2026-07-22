/**
 * Exportación Excel/PDF del listado de inventario visible.
 */

import {
  formatProductCostPrice,
  formatProductRetailPrice,
  getProductMinStock,
  getProductRetailPrice,
  getProductCostPrice,
  isProductActive,
} from '@/features/inventory/utils/productFormatters';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';

export function buildInventoryExportRows(products) {
  return products.map((p) => ({
    id: p.id,
    nombre: p.name,
    categoria: p.categoryName || p.category_name || '',
    sku: p.sku || '',
    stock: p.quantity ?? 0,
    min_stock: getProductMinStock(p),
    precio_venta: getProductRetailPrice(p) ?? '',
    precio_costo: getProductCostPrice(p) ?? '',
    activo: isProductActive(p) ? 'Sí' : 'No',
  }));
}

function filterMeta({ searchDebounced, showLowStockOnly, categoryFilter, showInactive, exportRows }) {
  return [
    `Total: ${exportRows.length} producto(s)`,
    searchDebounced ? `Búsqueda: «${searchDebounced}»` : null,
    showLowStockOnly ? 'Solo stock bajo' : null,
    categoryFilter ? `Categoría ID ${categoryFilter}` : null,
    showInactive ? 'Incluye inactivos' : 'Solo activos',
  ].filter(Boolean);
}

export function exportInventoryExcel({
  products,
  searchDebounced,
  showLowStockOnly,
  categoryFilter,
  showInactive,
}) {
  const exportRows = buildInventoryExportRows(products);
  if (exportRows.length === 0) return false;

  downloadExcelTable({
    sheetName: 'Inventario',
    title: 'Inventario de productos',
    meta: filterMeta({
      searchDebounced,
      showLowStockOnly,
      categoryFilter,
      showInactive,
      exportRows,
    }),
    columns: [
      { header: 'ID', key: 'id', align: 'center' },
      { header: 'Nombre', key: 'nombre', emphasis: true },
      { header: 'Categoría', key: 'categoria' },
      { header: 'SKU', key: 'sku' },
      { header: 'Stock', key: 'stock', align: 'right' },
      { header: 'Mín.', key: 'min_stock', align: 'right' },
      {
        header: 'Precio costo',
        accessor: (r) => formatProductCostPrice({ costPrice: r.precio_costo }),
        align: 'right',
      },
      {
        header: 'Precio venta',
        accessor: (r) => formatProductRetailPrice({ retailPrice: r.precio_venta }),
        align: 'right',
      },
      { header: 'Activo', key: 'activo', align: 'center' },
    ],
    rows: exportRows,
    fileBase: 'inventario-mrkutz',
  });
  return true;
}

export function exportInventoryPdf({
  products,
  searchDebounced,
  showLowStockOnly,
  categoryFilter,
  showInactive,
}) {
  const exportRows = buildInventoryExportRows(products);
  if (exportRows.length === 0) return false;

  downloadTablePDF({
    filename: `inventario-mrkutz-${pdfFileDateSuffix()}.pdf`,
    title: 'Inventario de productos',
    meta: filterMeta({
      searchDebounced,
      showLowStockOnly,
      categoryFilter,
      showInactive,
      exportRows,
    }),
    orientation: 'landscape',
    columns: [
      { header: 'ID', key: 'id', align: 'center' },
      { header: 'Nombre', key: 'nombre' },
      { header: 'Categoría', key: 'categoria' },
      { header: 'SKU', key: 'sku' },
      { header: 'Stock', key: 'stock', align: 'right' },
      { header: 'Mín.', key: 'min_stock', align: 'right' },
      {
        header: 'Costo',
        accessor: (r) => formatProductCostPrice({ costPrice: r.precio_costo }),
        align: 'right',
      },
      {
        header: 'Venta',
        accessor: (r) => formatProductRetailPrice({ retailPrice: r.precio_venta }),
        align: 'right',
      },
      { header: 'Activo', key: 'activo', align: 'center' },
    ],
    rows: exportRows,
  });
  return true;
}
