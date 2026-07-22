/**
 * Modelo de formulario de proveedor (alta, edición, modal).
 */

import {
  sanitizePhone,
  validateEmail,
  validateNotes,
  validatePhone,
  validateRequiredField,
  validateTaxId,
  TEXT_NAME_MAX,
} from '@/shared/utils/formValidation';

export function createEmptySupplierForm(overrides = {}) {
  return {
    name: '',
    taxId: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    isActive: true,
    ...overrides,
  };
}

export function mapSupplierToForm(supplier) {
  if (!supplier) return createEmptySupplierForm();
  return createEmptySupplierForm({
    name: supplier.name ?? '',
    taxId: supplier.taxId ?? supplier.tax_id ?? '',
    contactName: supplier.contactName ?? supplier.contact_name ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
    isActive: (supplier.isActive ?? supplier.is_active) !== false,
  });
}

export function buildSupplierPayload(form, { includeActive = false } = {}) {
  const taxId = validateTaxId(form.taxId);
  const phone = validatePhone(form.phone, { required: false });
  const payload = {
    name: String(form.name || '').trim(),
    taxId: taxId.valid ? taxId.value : String(form.taxId || '').trim() || null,
    contactName: String(form.contactName || '').trim() || null,
    phone: phone.valid && phone.value ? phone.value : sanitizePhone(form.phone) || null,
    email: String(form.email || '').trim() || null,
    address: String(form.address || '').trim() || null,
    notes: String(form.notes || '').trim() || null,
  };
  if (includeActive) {
    payload.isActive = form.isActive !== false;
  }
  return payload;
}

export function validateSupplierForm(form) {
  const errors = {};

  const name = validateRequiredField(form?.name, 'El nombre');
  if (!name.valid) errors.name = name.message;
  else if (String(form.name).trim().length > TEXT_NAME_MAX) {
    errors.name = `Máximo ${TEXT_NAME_MAX} caracteres.`;
  }

  const taxId = validateTaxId(form?.taxId);
  if (!taxId.valid) errors.taxId = taxId.message;

  const contact = String(form?.contactName ?? '').trim();
  if (contact.length > TEXT_NAME_MAX) {
    errors.contactName = `Máximo ${TEXT_NAME_MAX} caracteres.`;
  }

  const phone = validatePhone(form?.phone, { required: false });
  if (!phone.valid) errors.phone = phone.message;

  const emailRaw = String(form?.email ?? '').trim();
  if (emailRaw) {
    const email = validateEmail(emailRaw);
    if (!email.valid) errors.email = email.message;
  }

  const address = String(form?.address ?? '');
  if (address.length > 500) {
    errors.address = 'La dirección no puede superar 500 caracteres.';
  }

  const notes = validateNotes(form?.notes, { max: 1000 });
  if (!notes.valid) errors.notes = notes.message;

  const keys = Object.keys(errors);
  return {
    valid: keys.length === 0,
    message: keys.length ? errors[keys[0]] : '',
    errors,
  };
}
