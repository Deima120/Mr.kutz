/**
 * Modelo único de formulario de producto (alta, edición, modal, importación).
 */

import { validateProductForm } from '@/shared/utils/formValidation';
import {
  buildProductPayload,
  createEmptyProductForm,
  mapProductToForm,
  proposedUnitCostFromProduct,
  sanitizeImportRows,
} from '@/features/inventory/models/productFormPayload';

export {
  buildProductPayload,
  createEmptyProductForm,
  mapProductToForm,
  proposedUnitCostFromProduct,
  sanitizeImportRows,
};

export function getProductMetaFromApi(product) {
  if (!product) return null;
  return {
    quantity: product.quantity ?? 0,
    stockUpdatedAt:
      product.stockUpdatedAt ?? product.stock_updated_at ?? product.inventory?.lastUpdated ?? null,
    sku: product.sku || '',
  };
}

export function validateProductFormData(data) {
  return validateProductForm(data);
}

/**
 * Valida una fila de importación con las mismas reglas del formulario.
 * Ignora costPrice (no importable).
 */
export function validateImportProductRow(row) {
  const formLike = createEmptyProductForm({
    name: row?.name ?? '',
    description: row?.description ?? '',
    unit: row?.unit || 'unit',
    minStock: row?.minStock ?? 0,
    retailPrice:
      row?.retailPrice != null && row.retailPrice !== '' ? String(row.retailPrice) : '',
  });
  return validateProductForm(formLike);
}
