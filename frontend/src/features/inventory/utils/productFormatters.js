export const MOVEMENT_LABELS = {
  purchase: 'Compra',
  sale: 'Venta',
  adjustment: 'Ajuste',
  damage: 'Daño o pérdida',
};

export function getProductMinStock(product) {
  return product?.min_stock ?? product?.minStock ?? 0;
}

export function getProductRetailPrice(product) {
  const value = product?.retail_price ?? product?.retailPrice;
  if (value == null || value === '' || Number(value) <= 0) return null;
  return Number(value);
}

export function getProductCostPrice(product) {
  const value = product?.cost_price ?? product?.costPrice;
  if (value == null || value === '' || Number(value) <= 0) return null;
  return Number(value);
}

export function formatProductCostPrice(product) {
  const price = getProductCostPrice(product);
  return price != null ? `$${price.toFixed(2)}` : '—';
}

export function getProductMargin(product) {
  const retail = getProductRetailPrice(product);
  const cost = getProductCostPrice(product);
  if (retail == null || cost == null) return null;
  return retail - cost;
}

export function formatProductMargin(product) {
  const margin = getProductMargin(product);
  if (margin == null) return '—';
  return `$${margin.toFixed(2)}`;
}

export function formatInventoryValue(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isMovementVoided(movement) {
  return Boolean(movement?.voidedAt ?? movement?.voided_at);
}

export function formatProductRetailPrice(product) {
  const price = getProductRetailPrice(product);
  return price != null ? `$${price.toFixed(2)}` : '—';
}

/** Etiqueta de unidad para inventario (solo por unidad). */
export function formatProductUnit(unit, quantity) {
  if (!unit || unit === 'unit' || unit === 'u' || unit === 'unidad' || unit === 'pz') {
    if (quantity == null) return 'Unidad';
    return Number(quantity) === 1 ? 'unidad' : 'unidades';
  }
  return unit;
}

export function isProductActive(product) {
  const value = product?.isActive ?? product?.is_active;
  return value !== false;
}

export function isLowStock(product) {
  return (product?.quantity ?? 0) <= getProductMinStock(product);
}

/** Prioriza referencias estructuradas y conserva compatibilidad con notas legacy. */
export function getMovementReference(movement) {
  const structured = movement?.reference_data ?? movement?.referenceData ?? movement?.reference;
  const orderNumber =
    structured?.orderNumber ?? structured?.order_number ??
    movement?.orderNumber ?? movement?.order_number ?? movement?.purchaseOrderNumber ??
    movement?.purchase_order_number;
  const supplierName =
    structured?.supplierName ?? structured?.supplier_name ??
    structured?.supplier?.name ?? movement?.supplier?.name ?? movement?.supplierName ??
    movement?.supplier_name;
  const reference =
    structured?.receiptReference ?? structured?.receipt_reference ??
    structured?.receipt?.reference ?? movement?.receipt?.reference ??
    movement?.receipt_reference ?? movement?.goodsReceiptNumber ?? movement?.goods_receipt_number;
  const receiptId =
    structured?.receiptId ?? structured?.receipt_id ?? structured?.receipt?.id ??
    movement?.receiptId ?? movement?.receipt_id ?? movement?.goodsReceiptId ??
    movement?.goods_receipt_id ??
    (movement?.reference_type === 'receipt' ? movement?.reference_id : undefined);
  const purchaseId =
    structured?.purchaseId ?? structured?.purchase_id ?? structured?.purchase?.id ??
    movement?.purchaseId ?? movement?.purchase_id ?? movement?.purchase_order_id ??
    (movement?.reference_type === 'purchase' ? movement?.reference_id : undefined);
  if (purchaseId || receiptId || supplierName || reference) {
    return {
      type: 'purchase',
      id: purchaseId,
      label: orderNumber ? `Orden ${orderNumber}` : purchaseId ? `Orden #${purchaseId}` : 'Recepción de compra',
      receiptId,
      supplierName,
      reference,
    };
  }

  const notes = movement?.notes || '';
  const paymentMatch = notes.match(/pago #(\d+)/i);
  if (paymentMatch) {
    return { type: 'payment', id: paymentMatch[1], label: `Pago #${paymentMatch[1]}` };
  }
  const purchaseMatch = notes.match(/compra #(\d+)/i);
  if (purchaseMatch) {
    return { type: 'purchase', id: purchaseMatch[1], label: `Compra #${purchaseMatch[1]}` };
  }
  return null;
}

export function formatMovementDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-ES');
}
