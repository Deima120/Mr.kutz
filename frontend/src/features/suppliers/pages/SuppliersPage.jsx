import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as supplierService from '@/features/suppliers/services/supplierService';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';

const EMPTY_FORM = {
  name: '',
  taxId: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};
const isActive = (supplier) => (supplier.isActive ?? supplier.is_active) !== false;

function supplierPayload(form) {
  return {
    name: form.name.trim(),
    taxId: form.taxId.trim() || null,
    contactName: form.contactName.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSuppliers(await supplierService.getSuppliers({ active: 'all', limit: 100 }));
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los proveedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre del proveedor es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = supplierPayload(form);
      if (editingId) await supplierService.updateSupplier(editingId, payload);
      else await supplierService.createSupplier(payload);
      reset();
      await load();
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name ?? '',
      taxId: supplier.taxId ?? supplier.tax_id ?? '',
      contactName: supplier.contactName ?? supplier.contact_name ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
    });
    setError('');
  };

  const toggleActive = async (supplier) => {
    setSaving(true);
    try {
      await supplierService.updateSupplier(supplier.id, { isActive: !isActive(supplier) });
      await load();
    } catch (err) {
      setError(err?.message || 'No se pudo cambiar el estado.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (supplier) => {
    if (!window.confirm(`¿Eliminar el proveedor "${supplier.name}"?`)) return;
    try {
      await supplierService.deleteSupplier(supplier.id);
      await load();
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar. Puedes desactivarlo si tiene compras asociadas.');
    }
  };

  const field = (key, placeholder, type = 'text') => (
    <input
      type={type}
      value={form[key]}
      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
      className="input-premium py-2 text-sm"
      placeholder={placeholder}
      maxLength={key === 'notes' ? 500 : key === 'taxId' ? 50 : 150}
    />
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="Proveedores"
        subtitle="Directorio para órdenes de compra"
        actions={<Link to="/purchases" className="btn-admin-outline text-sm">Volver a compras</Link>}
      />
      {error && <div className="alert-error mb-3 text-sm" role="alert">{error}</div>}
      <form onSubmit={submit} className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold">
          {editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {field('name', 'Nombre *')}
          {field('taxId', 'Identificación fiscal')}
          {field('contactName', 'Persona de contacto')}
          {field('phone', 'Teléfono', 'tel')}
          {field('email', 'Correo', 'email')}
          {field('address', 'Dirección')}
          {field('notes', 'Notas')}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {editingId && <button type="button" onClick={reset} className="btn-admin-outline text-sm">Cancelar</button>}
          <button type="submit" disabled={saving} className="btn-admin text-sm">
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </form>
      <DataCard compact>
        {loading ? <p className="py-10 text-center text-sm text-stone-500">Cargando…</p> : suppliers.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">No hay proveedores registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeader compact>Proveedor</TableHeader>
                <TableHeader compact>Identificación</TableHeader>
                <TableHeader compact>Contacto</TableHeader>
                <TableHeader compact>Teléfono</TableHeader>
                <TableHeader compact>Correo</TableHeader>
                <TableHeader compact>Estado</TableHeader>
                <TableHeader compact className="text-right">Acciones</TableHeader>
              </TableHead>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell compact className="text-xs font-semibold">{supplier.name}</TableCell>
                    <TableCell compact className="text-xs">{supplier.taxId ?? supplier.tax_id ?? '—'}</TableCell>
                    <TableCell compact className="text-xs">{supplier.contactName ?? supplier.contact_name ?? '—'}</TableCell>
                    <TableCell compact className="text-xs">{supplier.phone || '—'}</TableCell>
                    <TableCell compact className="text-xs">{supplier.email || '—'}</TableCell>
                    <TableCell compact>
                      <button type="button" disabled={saving} onClick={() => toggleActive(supplier)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isActive(supplier) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-100 text-stone-600'}`}>
                        {isActive(supplier) ? 'Activo' : 'Inactivo'}
                      </button>
                    </TableCell>
                    <TableCell compact>
                      <div className="flex justify-end gap-1">
                        <AdminIconButton icon={editingId === supplier.id ? Check : Pencil} label="Editar proveedor" onClick={() => edit(supplier)} />
                        {editingId === supplier.id && <AdminIconButton icon={X} label="Cancelar edición" onClick={reset} />}
                        <AdminIconButton icon={Trash2} label="Eliminar proveedor" variant="danger" onClick={() => remove(supplier)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataCard>
    </div>
  );
}
