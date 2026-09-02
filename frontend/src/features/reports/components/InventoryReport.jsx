/**
 * Reporte de inventario — datos reales vía /products (+ summary).
 */

import { useCallback, useEffect, useState } from 'react';
import * as productService from '@/features/inventory/services/productService';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import {
  AdminPagination,
  AdminFilterRow,
  FilterSelect,
} from '@/shared/components/admin/AdminListControls';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { useAppToast } from '@/shared/feedback/ToastContext';
import {
  exportInventoryExcel,
  exportInventoryPdf,
} from '@/features/inventory/utils/inventoryExport';
import {
  formatInventoryValue,
  formatProductRetailPrice,
  getProductMinStock,
  isProductActive,
} from '@/features/inventory/utils/productFormatters';

const STOCK_SEGMENTS = [
  { id: '', label: 'Todos' },
  { id: 'low', label: 'Stock bajo' },
];
const ACTIVE_SEGMENTS = [
  { id: 'active', label: 'Activos' },
  { id: 'all', label: 'Incluye inactivos' },
];

export default function InventoryReport() {
  const toast = useAppToast();
  const [stockFilter, setStockFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productService.getProducts({
        active: activeFilter === 'active' ? undefined : 'false',
        lowStock: stockFilter === 'low' ? 'true' : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const list = result?.data ?? result?.products ?? (Array.isArray(result) ? result : []);
      setRows(Array.isArray(list) ? list : []);
      setTotal(result?.total ?? list.length);
      setSummary(result?.summary ?? null);
    } catch (err) {
      toast.error(err?.message || 'No se pudo cargar el inventario');
      setRows([]);
      setTotal(0);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [stockFilter, activeFilter, page, pageSize, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [stockFilter, activeFilter, pageSize]);

  return (
    <div className="space-y-4">
      <AdminFilterRow>
        <FilterSelect
          label="Stock"
          options={STOCK_SEGMENTS}
          value={stockFilter}
          onChange={setStockFilter}
        />
        <FilterSelect
          label="Estado"
          options={ACTIVE_SEGMENTS}
          value={activeFilter}
          onChange={setActiveFilter}
        />
        <AdminExportButtons
          onExcel={() =>
            exportInventoryExcel({
              products: rows,
              searchDebounced: '',
              showLowStockOnly: stockFilter === 'low',
              categoryFilter: '',
              showInactive: activeFilter !== 'active',
            })
          }
          onPdf={() =>
            exportInventoryPdf({
              products: rows,
              searchDebounced: '',
              showLowStockOnly: stockFilter === 'low',
              categoryFilter: '',
              showInactive: activeFilter !== 'active',
            })
          }
        />
      </AdminFilterRow>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DataCard title="Valorización (costo)">
          <p className="text-2xl font-semibold text-gold">
            {formatInventoryValue(summary?.inventoryValue ?? 0)}
          </p>
        </DataCard>
        <DataCard title="Unidades en stock">
          <p className="text-2xl font-semibold text-stone-800">{summary?.totalUnits ?? '—'}</p>
        </DataCard>
        <DataCard title="Alertas stock bajo">
          <p className="text-2xl font-semibold text-amber-700">{summary?.lowStockCount ?? 0}</p>
        </DataCard>
      </div>

      <DataCard title="Productos">
        {loading ? (
          <p className="text-stone-500 text-sm">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-stone-500 text-sm">Sin productos con el filtro actual.</p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>Producto</TableHeader>
                <TableHeader>SKU</TableHeader>
                <TableHeader align="right">Stock</TableHeader>
                <TableHeader align="right">Mín.</TableHeader>
                <TableHeader align="right">P. venta</TableHeader>
                <TableHeader>Activo</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((p) => {
                  const qty = p.quantity ?? 0;
                  const min = getProductMinStock(p);
                  const low = min > 0 && qty <= min;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-stone-500">{p.sku || '—'}</TableCell>
                      <TableCell
                        align="right"
                        className={low ? 'font-semibold text-amber-700' : ''}
                      >
                        {qty}
                      </TableCell>
                      <TableCell align="right">{min}</TableCell>
                      <TableCell align="right">{formatProductRetailPrice(p)}</TableCell>
                      <TableCell className="text-xs">{isProductActive(p) ? 'Sí' : 'No'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <AdminPagination
              idPrefix="inv-report"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="productos"
            />
          </>
        )}
      </DataCard>
    </div>
  );
}
