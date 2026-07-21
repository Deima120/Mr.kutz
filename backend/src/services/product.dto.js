/**
 * DTO consistente para productos (sin objetos anidados de Prisma).
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
    min_stock: product.minStock,
    minStock: product.minStock,
    category_id: product.categoryId,
    categoryId: product.categoryId,
    is_active: product.isActive,
    isActive: product.isActive,
    retail_price: product.retailPrice,
    retailPrice: product.retailPrice,
    cost_price: product.costPrice,
    costPrice: product.costPrice,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    quantity: inventory?.quantity ?? product.quantity ?? 0,
    stock_updated_at: inventory?.lastUpdated ?? product.stock_updated_at ?? null,
    category_name: category?.name ?? product.category_name ?? null,
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
    is_active: category.isActive,
    isActive: category.isActive,
    product_count: category._count?.products ?? category.product_count ?? 0,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

export function toMovementDto(movement) {
  if (!movement) return null;
  const isManual =
    ['adjustment', 'damage'].includes(movement.movementType) &&
    (!movement.sourceType || movement.sourceType === 'manual_adjustment');

  return {
    id: movement.id,
    product_id: movement.productId,
    quantity_change: movement.quantityChange,
    movement_type: movement.movementType,
    source_type: movement.sourceType,
    goods_receipt_item_id: movement.goodsReceiptItemId,
    goods_receipt_id: movement.goodsReceiptItem?.goodsReceipt?.id ?? null,
    goods_receipt_number:
      movement.goodsReceiptItem?.goodsReceipt?.receiptNumber ?? null,
    purchase_id: movement.goodsReceiptItem?.goodsReceipt?.purchaseId ?? null,
    purchase_order_number:
      movement.goodsReceiptItem?.goodsReceipt?.purchase?.orderNumber ?? null,
    supplier_name:
      movement.goodsReceiptItem?.goodsReceipt?.purchase?.supplier?.name ?? null,
    payment_id: movement.paymentId,
    payment_reference: movement.payment?.reference ?? null,
    reversal_of_movement_id: movement.reversalOfMovementId,
    reversal_movement_id: movement.reversalMovement?.id ?? null,
    notes: movement.notes,
    created_at: movement.createdAt,
    created_by_email: movement.creator?.email ?? null,
    voided_at: movement.voidedAt ?? null,
    void_reason: movement.voidReason ?? null,
    voided_by_email: movement.voider?.email ?? null,
    can_void: Boolean(!movement.voidedAt && isManual),
  };
}
