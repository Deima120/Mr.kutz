/**
 * Payload y mapeo de formulario de producto (sin validación ni React).
 */

export function createEmptyProductForm(overrides = {}) {
  return {
    name: '',
    description: '',
    unit: 'unit',
    minStock: 0,
    categoryId: '',
    isActive: true,
    retailPrice: '',
    costPrice: '',
    ...overrides,
  };
}

export function mapProductToForm(product) {
  if (!product) return createEmptyProductForm();

  const categoryId = product.categoryId ?? product.category_id;
  const minStock = product.minStock ?? product.min_stock ?? 0;
  const isActive = product.isActive ?? product.is_active;
  const retailPrice = product.retailPrice ?? product.retail_price;
  const costPrice = product.costPrice ?? product.cost_price;

  return createEmptyProductForm({
    name: product.name || '',
    description: product.description || '',
    unit: product.unit || 'unit',
    minStock,
    categoryId: categoryId != null && categoryId !== '' ? String(categoryId) : '',
    isActive: isActive !== false,
    retailPrice: retailPrice != null && retailPrice !== '' ? String(retailPrice) : '',
    costPrice: costPrice != null && costPrice !== '' ? String(costPrice) : '',
  });
}

/** Payload de API: nunca envía costPrice (solo recepciones). */
export function buildProductPayload(formData, { isEdit = false } = {}) {
  const payload = {
    name: String(formData.name || '').trim(),
    unit: formData.unit || 'unit',
    minStock: Number.isFinite(Number(formData.minStock)) ? Number(formData.minStock) : 0,
  };

  if (formData.description?.trim()) {
    payload.description = formData.description.trim();
  }
  if (formData.categoryId) {
    payload.categoryId = Number(formData.categoryId);
  }
  if (
    formData.retailPrice !== '' &&
    formData.retailPrice != null &&
    !Number.isNaN(Number(formData.retailPrice))
  ) {
    payload.retailPrice = Number(formData.retailPrice);
  }
  if (isEdit) {
    payload.isActive = formData.isActive !== false;
  }

  return payload;
}

/** Filas listas para API: sin costPrice. */
export function sanitizeImportRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const next = { ...row };
    delete next.costPrice;
    delete next.cost_price;
    delete next.precio_costo;
    return next;
  });
}

/** Costo sugerido al seleccionar producto en una compra (solo si hay promedio > 0). */
export function proposedUnitCostFromProduct(product) {
  const value = product?.cost_price ?? product?.costPrice;
  if (value == null || value === '' || Number(value) <= 0) return '';
  return String(Number(value));
}
