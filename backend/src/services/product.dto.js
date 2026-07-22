/**
 * DTO camelCase para productos, categorías y movimientos (sin duplicar snake_case).
 */

export function toProductDto(product) {
  if (!product) return null;
  const inventory = product.inventory;
  const category = product.category;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    unit: product.unit,
    minStock: product.minStock,
    categoryId: product.categoryId,
    isActive: product.isActive,
    retailPrice: product.retailPrice,
    costPrice: product.costPrice,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    quantity: inventory?.quantity ?? product.quantity ?? 0,
    stockUpdatedAt: inventory?.lastUpdated ?? product.stockUpdatedAt ?? null,
    categoryName: category?.name ?? product.categoryName ?? null,
  };
}

export function normalizeCategoryName(name) {
  return String(name ?? '').trim().toUpperCase();
}

export function normalizeCategoryDescription(description) {
  if (description == null) return null;
  const trimmed = String(description).trim();
  return trimmed === '' ? null : trimmed.toUpperCase();
}

export function toCategoryDto(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name ? normalizeCategoryName(category.name) : category.name,
    description: category.description
      ? normalizeCategoryDescription(category.description)
      : category.description,
    isActive: category.isActive,
    productCount: category._count?.products ?? category.productCount ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function toMovementDto(movement) {
  if (!movement) return null;
  const isManual =
    ['adjustment', 'damage'].includes(movement.movementType) &&
    (!movement.sourceType || movement.sourceType === 'manual_adjustment');

  return {
    id: movement.id,
    productId: movement.productId,
    quantityChange: movement.quantityChange,
    movementType: movement.movementType,
    sourceType: movement.sourceType,
    goodsReceiptItemId: movement.goodsReceiptItemId,
    goodsReceiptId: movement.goodsReceiptItem?.goodsReceipt?.id ?? null,
    goodsReceiptNumber:
      movement.goodsReceiptItem?.goodsReceipt?.receiptNumber ?? null,
    purchaseId: movement.goodsReceiptItem?.goodsReceipt?.purchaseId ?? null,
    purchaseOrderNumber:
      movement.goodsReceiptItem?.goodsReceipt?.purchase?.orderNumber ?? null,
    supplierName:
      movement.goodsReceiptItem?.goodsReceipt?.purchase?.supplier?.name ?? null,
    paymentId: movement.paymentId,
    paymentReference: movement.payment?.reference ?? null,
    reversalOfMovementId: movement.reversalOfMovementId,
    reversalMovementId: movement.reversalMovement?.id ?? null,
    notes: movement.notes,
    createdAt: movement.createdAt,
    createdByEmail: movement.creator?.email ?? null,
    voidedAt: movement.voidedAt ?? null,
    voidReason: movement.voidReason ?? null,
    voidedByEmail: movement.voider?.email ?? null,
    canVoid: Boolean(!movement.voidedAt && isManual),
  };
}
