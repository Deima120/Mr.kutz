/**
 * Directorio de proveedores embebido en el tab de Compras.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X, Plus } from 'lucide-react';
import * as supplierService from '@/features/suppliers/services/supplierService';
import SupplierForm from '@/features/suppliers/components/SupplierForm';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';

const isActive = (supplier) => (supplier.isActive ?? supplier.is_active) !== false;

export default function SuppliersPanel({ highlightSupplierId = null }) {
  const toast = useAppToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null); // 'create' | number (edit id)
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSuppliers(await supplierService.getSuppliers({ active: 'all', limit: 100 }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los proveedores.'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!highlightSupplierId || loading) return;
    const el = document.getElementById(`supplier-row-${highlightSupplierId}`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightSupplierId, loading, suppliers]);

  const toggleActive = async (supplier) => {
    setSaving(true);
    try {
      await supplierService.updateSupplier(supplier.id, { isActive: !isActive(supplier) });
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await supplierService.deleteSupplier(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          'No se pudo eliminar. Puedes desactivarlo si tiene compras asociadas.'
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          Directorio usado al crear órdenes. También puedes crear proveedores desde el formulario de
          orden.
        </p>
        {formMode == null ? (
          <button
            type="button"
            onClick={() => setFormMode('create')}
            className="btn-admin inline-flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nuevo proveedor
          </button>
        ) : null}
      </div>

      {formMode != null ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold">
            {formMode === 'create' ? 'Nuevo proveedor' : 'Editar proveedor'}
          </p>
          <SupplierForm
            variant="embedded"
            supplierId={formMode === 'create' ? null : formMode}
            onCancel={() => setFormMode(null)}
            onSuccess={() => {
              setFormMode(null);
              toast.success(
                formMode === 'create' ? 'Proveedor creado.' : 'Proveedor actualizado.'
              );
              load();
            }}
          />
        </div>
      ) : null}

      <DataCard compact>
        {loading ? (
          <p className="py-10 text-center text-sm text-stone-500">Cargando…</p>
        ) : suppliers.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">No hay proveedores registrados.</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeader compact>Proveedor</TableHeader>
              <TableHeader compact>Identificación</TableHeader>
              <TableHeader compact>Contacto</TableHeader>
              <TableHeader compact>Teléfono</TableHeader>
              <TableHeader compact>Estado</TableHeader>
              <TableHeader compact className="text-right">
                Acciones
              </TableHeader>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => {
                const highlighted = String(supplier.id) === String(highlightSupplierId);
                return (
                  <TableRow
                    key={supplier.id}
                    id={`supplier-row-${supplier.id}`}
                    className={highlighted ? 'bg-amber-50/80 ring-1 ring-inset ring-gold/30' : ''}
                  >
                    <TableCell compact className="text-xs font-semibold">
                      {supplier.name}
                    </TableCell>
                    <TableCell compact className="text-xs">
                      {supplier.taxId ?? supplier.tax_id ?? '—'}
                    </TableCell>
                    <TableCell compact className="text-xs">
                      {supplier.contactName ?? supplier.contact_name ?? '—'}
                    </TableCell>
                    <TableCell compact className="text-xs">
                      {supplier.phone || '—'}
                    </TableCell>
                    <TableCell compact>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => toggleActive(supplier)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          isActive(supplier)
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-stone-200 bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isActive(supplier) ? 'Activo' : 'Inactivo'}
                      </button>
                    </TableCell>
                    <TableCell compact>
                      <div className="flex justify-end gap-1">
                        <AdminIconButton
                          icon={formMode === supplier.id ? Check : Pencil}
                          label="Editar proveedor"
                          onClick={() => setFormMode(supplier.id)}
                        />
                        {formMode === supplier.id ? (
                          <AdminIconButton icon={X} label="Cancelar edición" onClick={() => setFormMode(null)} />
                        ) : null}
                        <AdminIconButton
                          icon={Trash2}
                          label="Eliminar proveedor"
                          variant="danger"
                          onClick={() => setDeleteTarget(supplier)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Eliminar proveedor?"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar permanentemente «<strong className="text-stone-800">{deleteTarget.name}</strong>»?
              Esta acción no se puede deshacer.
            </>
          ) : null
        }
        confirmLabel="Sí, eliminar"
        isSubmitting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={remove}
      />
    </div>
  );
}
