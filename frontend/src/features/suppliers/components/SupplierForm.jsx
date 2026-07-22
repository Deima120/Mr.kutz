/**
 * Formulario de proveedor compartido (embedded en tab Compras / modal).
 */

import { useEffect, useState } from 'react';
import * as supplierService from '@/features/suppliers/services/supplierService';
import {
  buildSupplierPayload,
  createEmptySupplierForm,
  mapSupplierToForm,
  validateSupplierForm,
} from '@/features/suppliers/models/supplierFormModel';
import { getApiErrorMessage } from '@/shared/utils/formValidation';

export default function SupplierForm({
  variant = 'embedded',
  supplierId = null,
  initialName = '',
  onCancel,
  onSuccess,
}) {
  const isEdit = supplierId != null;
  const [form, setForm] = useState(() =>
    createEmptySupplierForm(initialName ? { name: initialName } : {})
  );
  const [loading, setLoading] = useState(Boolean(isEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) {
      setForm(createEmptySupplierForm(initialName ? { name: initialName } : {}));
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    supplierService
      .getSupplierById(supplierId)
      .then((supplier) => {
        if (!cancelled) setForm(mapSupplierToForm(supplier));
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo cargar el proveedor.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, supplierId, initialName]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateSupplierForm(form);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildSupplierPayload(form, { includeActive: isEdit });
      const saved = isEdit
        ? await supplierService.updateSupplier(supplierId, payload)
        : await supplierService.createSupplier(payload);
      onSuccess?.({ supplier: saved, created: !isEdit, updated: isEdit });
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el proveedor.'));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    variant === 'modal'
      ? 'input-premium py-2 text-sm'
      : 'input-premium py-2 text-sm';

  if (loading) {
    return <p className="py-8 text-center text-sm text-stone-500">Cargando proveedor…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? (
        <div className="alert-error text-sm" role="alert">
          {error}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
          Nombre *
          <input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            className={`${fieldClass} mt-1`}
            placeholder="Nombre del proveedor"
            maxLength={150}
            data-autofocus
            required
          />
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Identificación fiscal
          <input
            value={form.taxId}
            onChange={(e) => setField('taxId', e.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={50}
          />
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Contacto
          <input
            value={form.contactName}
            onChange={(e) => setField('contactName', e.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={150}
          />
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Teléfono
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
            className={`${fieldClass} mt-1`}
            maxLength={15}
            placeholder="Solo dígitos"
          />
        </label>
        <label className="text-xs font-semibold text-stone-600">
          Correo
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={150}
          />
        </label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
          Dirección
          <input
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={500}
          />
        </label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
          Notas
          <textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            className={`${fieldClass} mt-1 resize-none`}
            rows={2}
            maxLength={1000}
          />
        </label>
        {isEdit ? (
          <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="rounded border-stone-300 text-gold focus:ring-gold/40"
            />
            Proveedor activo
          </label>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={saving} className="btn-admin-outline text-sm">
            Cancelar
          </button>
        ) : null}
        <button type="submit" disabled={saving} className="btn-admin text-sm">
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
        </button>
      </div>
    </form>
  );
}
