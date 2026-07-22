/**
 * Tabla de productos del inventario — columnas esenciales, sin scroll horizontal.
 */

import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Eye,
  ShoppingCart,
  History,
  SlidersHorizontal,
  Archive,
  ShoppingBag,
} from 'lucide-react';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminMoreMenu from '@/shared/components/admin/AdminMoreMenu';
import { AdminPagination } from '@/shared/components/admin/AdminListControls';
import {
  formatProductRetailPrice,
  formatProductUnit,
  getProductMinStock,
  isLowStock,
  isProductActive,
} from '@/features/inventory/utils/productFormatters';
import { INVENTORY_PAGE_SIZE_OPTIONS } from '@/features/inventory/hooks/useInventoryList';
import { MANUAL_STOCK_ADJUST_ENABLED } from '@/features/inventory/inventoryFlags';

export default function InventoryProductsTable({
  products,
  listTotal,
  safePage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onAdjust,
  onSell,
  onHistory,
  onArchive,
  archivingId,
}) {
  const navigate = useNavigate();

  return (
    <>
      <AdminPagination
        idPrefix="inventory"
        page={safePage}
        pageSize={pageSize}
        total={listTotal}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={INVENTORY_PAGE_SIZE_OPTIONS}
        itemLabel={`producto${listTotal !== 1 ? 's' : ''}`}
        showSummary
        layout="bar"
      />

      <Table scroll={false} className="table-fixed">
        <TableHead>
          <TableHeader compact className="w-[42%]">
            Producto
          </TableHeader>
          <TableHeader compact className="w-[18%]">
            Stock
          </TableHeader>
          <TableHeader compact className="w-[16%]">
            Precio
          </TableHeader>
          <TableHeader compact className="w-[24%] text-right">
            Acciones
          </TableHeader>
        </TableHead>
        <TableBody>
          {products.map((p) => {
            const low = isLowStock(p);
            const active = isProductActive(p);
            const category = p.categoryName || p.category_name;
            const minStock = getProductMinStock(p);
            const qty = p.quantity ?? 0;

            return (
              <TableRow key={p.id}>
                <TableCell compact className={`min-w-0 ${low ? 'bg-amber-50/50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/inventory/${p.id}`)}
                    className="font-medium text-barber-dark hover:text-gold transition-colors text-left block w-full truncate"
                  >
                    {p.name}
                  </button>
                  <p className="mt-0.5 text-[11px] text-stone-500 truncate">
                    {[category, p.sku].filter(Boolean).join(' · ') || 'Sin categoría'}
                    {!active ? ' · Archivado' : ''}
                  </p>
                </TableCell>

                <TableCell compact className={low ? 'bg-amber-50/50' : ''}>
                  <p className={`text-sm font-semibold tabular-nums ${low ? 'text-amber-700' : 'text-stone-900'}`}>
                    {qty}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {formatProductUnit(p.unit, qty)}
                    {minStock > 0 ? ` · mín. ${minStock}` : ''}
                  </p>
                </TableCell>

                <TableCell compact className={`tabular-nums ${low ? 'bg-amber-50/50' : ''}`}>
                  {formatProductRetailPrice(p)}
                </TableCell>

                <TableCell compact className={`text-right ${low ? 'bg-amber-50/50' : ''}`}>
                  <div className="inline-flex items-center justify-end gap-1">
                    <AdminIconButton
                      icon={Eye}
                      label="Ver producto"
                      onClick={() => navigate(`/inventory/${p.id}`)}
                    />
                    <AdminIconButton
                      icon={Pencil}
                      label="Editar producto"
                      onClick={() => onEdit(p.id)}
                    />
                    <AdminMoreMenu
                      label="Más acciones"
                      items={[
                        {
                          id: 'order',
                          label: 'Agregar a orden',
                          icon: ShoppingBag,
                          disabled: !active,
                          onClick: () => navigate(`/purchases?new=1&productId=${p.id}`),
                        },
                        {
                          id: 'sell',
                          label: 'Vender',
                          icon: ShoppingCart,
                          disabled: qty <= 0 || !active,
                          onClick: () => onSell(p),
                        },
                        {
                          id: 'history',
                          label: 'Historial',
                          icon: History,
                          onClick: () => onHistory(p),
                        },
                        MANUAL_STOCK_ADJUST_ENABLED
                          ? {
                              id: 'adjust',
                              label: 'Ajustar stock',
                              icon: SlidersHorizontal,
                              disabled: !active,
                              onClick: () => onAdjust?.(p),
                            }
                          : null,
                        {
                          id: 'archive',
                          label: active ? 'Archivar' : 'Ya archivado',
                          icon: Archive,
                          danger: true,
                          disabled: !active || archivingId === p.id || qty > 0,
                          onClick: () => onArchive(p),
                        },
                      ]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
