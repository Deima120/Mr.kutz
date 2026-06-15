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

export function toCategoryDto(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    is_active: category.isActive,
    isActive: category.isActive,
    product_count: category._count?.products ?? category.product_count ?? 0,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

export function toMovementDto(movement) {
  if (!movement) return null;
  const notes = movement.notes || '';
  const isManual = ['adjustment', 'damage'].includes(movement.movementType);
  const linkedDoc = /pago #\d+/i.test(notes) || /compra #\d+/i.test(notes);
  const isReversal = /anulación de ajuste/i.test(notes);

  return {
    id: movement.id,
    product_id: movement.productId,
    quantity_change: movement.quantityChange,
    movement_type: movement.movementType,
    notes: movement.notes,
    created_at: movement.createdAt,
    created_by_email: movement.creator?.email ?? null,
    voided_at: movement.voidedAt ?? null,
    void_reason: movement.voidReason ?? null,
    voided_by_email: movement.voider?.email ?? null,
    can_void: Boolean(
      !movement.voidedAt && isManual && !linkedDoc && !isReversal
    ),
  };
}
