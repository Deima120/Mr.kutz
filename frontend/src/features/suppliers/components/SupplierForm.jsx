/**
 * Formulario de proveedor compartido (embedded en tab Compras / modal).
 */

import { useEffect, useMemo, useState } from 'react';
import * as supplierService from '@/features/suppliers/services/supplierService';
import {
  buildSupplierPayload,
  createEmptySupplierForm,
  mapSupplierToForm,
  validateSupplierForm,
} from '@/features/suppliers/models/supplierFormModel';
import {
  getApiErrorMessage,
  validateEmail,
  validatePhone,
  validateRequiredField,
  validateTaxId,
  TEXT_NAME_MAX,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { AdminFormField } from '@/shared/components/FormValidationFields';
import {
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

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
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint } =
    useFormValidation();

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

  const nameValidation = useMemo(
    () => validateRequiredField(form.name, 'El nombre'),
    [form.name]
  );
  const taxIdValidation = useMemo(() => validateTaxId(form.taxId), [form.taxId]);
  const phoneValidation = useMemo(
    () => validatePhone(form.phone, { required: false }),
    [form.phone]
  );
  const emailValidation = useMemo(
    () => (String(form.email ?? '').trim() ? validateEmail(form.email) : { valid: true, message: '' }),
    [form.email]
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    clearFieldError(key);
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateSupplierForm(form);
    if (!applyValidation(validation)) {
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

  if (loading) {
    return <p className="py-8 text-center text-sm text-stone-500">Cargando proveedor…</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {error ? (
        <div className={ADMIN_FORM_ERROR_CLASS} role="alert">
          {error}
        </div>
      ) : null}

      <div className={ADMIN_FORM_GRID_CLASS}>
        <AdminFormField
          label="Nombre"
          htmlFor={`supplier-name-${variant}`}
          required
          className="sm:col-span-2"
          error={fieldError('name')}
          live={buildLiveHint('name', form.name, nameValidation, 'Nombre válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`supplier-name-${variant}`}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => markTouched('name')}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              placeholder="Nombre del proveedor"
              maxLength={TEXT_NAME_MAX}
              data-autofocus
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        <AdminFormField
          label="Identificación fiscal"
          htmlFor={`supplier-taxid-${variant}`}
          error={fieldError('taxId')}
          live={buildLiveHint('taxId', form.taxId, taxIdValidation, 'Formato válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`supplier-taxid-${variant}`}
              value={form.taxId}
              onChange={(e) => setField('taxId', e.target.value)}
              onBlur={() => markTouched('taxId')}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              maxLength={50}
              placeholder="Opcional"
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        <div className="group shrink-0">
          <label className={ADMIN_FORM_LABEL_CLASS} htmlFor={`supplier-contact-${variant}`}>
            Contacto
          </label>
          <input
            id={`supplier-contact-${variant}`}
            value={form.contactName}
            onChange={(e) => setField('contactName', e.target.value)}
            className={ADMIN_FORM_FIELD_COMPACT}
            maxLength={TEXT_NAME_MAX}
            placeholder="Opcional"
          />
        </div>

        <AdminFormField
          label="Teléfono"
          htmlFor={`supplier-phone-${variant}`}
          error={fieldError('phone')}
          live={buildLiveHint('phone', form.phone, phoneValidation, 'Teléfono válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`supplier-phone-${variant}`}
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
              onBlur={() => markTouched('phone')}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              maxLength={15}
              placeholder="Solo dígitos"
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        <AdminFormField
          label="Correo"
          htmlFor={`supplier-email-${variant}`}
          error={fieldError('email')}
          live={buildLiveHint('email', form.email, emailValidation, 'Correo válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`supplier-email-${variant}`}
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              onBlur={() => markTouched('email')}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              maxLength={150}
              placeholder="Opcional"
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        <AdminFormField
          label="Dirección"
          htmlFor={`supplier-address-${variant}`}
          className="sm:col-span-2"
          error={fieldError('address')}
        >
          {({ errorId, invalid, submitBorderClass }) => (
            <input
              id={`supplier-address-${variant}`}
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass}`}
              maxLength={500}
              placeholder="Opcional"
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        <AdminFormField
          label="Notas"
          htmlFor={`supplier-notes-${variant}`}
          className="sm:col-span-2"
          error={fieldError('notes')}
        >
          {({ errorId, invalid, submitBorderClass }) => (
            <textarea
              id={`supplier-notes-${variant}`}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className={`${ADMIN_FORM_FIELD_COMPACT} resize-none ${submitBorderClass}`}
              rows={2}
              maxLength={1000}
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>

        {isEdit ? (
          <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2 cursor-pointer">
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

      <AdminFormFooterActions className="mt-1">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-admin-outline text-sm py-2 px-3"
          >
            Cancelar
          </button>
        ) : null}
        <AdminFormPrimaryButton disabled={saving} className="text-sm py-2 px-4">
          <AdminFormLoadingButton loading={saving} loadingLabel="Guardando…">
            {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </AdminFormLoadingButton>
        </AdminFormPrimaryButton>
      </AdminFormFooterActions>
    </form>
  );
}
