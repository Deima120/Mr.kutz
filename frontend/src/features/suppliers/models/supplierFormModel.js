/**
 * Modelo de formulario de proveedor (alta, edición, modal).
 */

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
  const payload = {
    name: String(form.name || '').trim(),
    taxId: String(form.taxId || '').trim() || null,
    contactName: String(form.contactName || '').trim() || null,
    phone: String(form.phone || '').trim() || null,
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
  if (!String(form?.name || '').trim()) {
    return { valid: false, message: 'El nombre del proveedor es obligatorio.', errors: { name: 'El nombre es obligatorio.' } };
  }
  return { valid: true, message: '', errors: {} };
}
