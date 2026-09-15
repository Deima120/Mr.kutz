/**
 * Agregaciones puras de la ficha de producto (costo, proveedores, paginación kardex).
 */

export function clampMovementsPage({ limit = 20, offset = 0, maxLimit = 100 } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), maxLimit);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  return { limit: take, offset: skip };
}

/**
 * Resume proveedores a partir de líneas de recepción ya normalizadas.
 * @param {Array<{ supplierId: number|null, supplierName?: string|null, quantity: number, unitCost: number, receivedAt?: Date|string|null }>} receipts
 */
export function buildSuppliersFromReceipts(receipts = []) {
  const supplierMap = new Map();

  for (const receipt of receipts) {
    if (!receipt.supplierId) continue;
    const prev = supplierMap.get(receipt.supplierId) || {
      supplierId: receipt.supplierId,
      supplierName: receipt.supplierName,
      receiptCount: 0,
      totalQuantity: 0,
      lastReceivedAt: null,
      lastUnitCost: null,
    };
    prev.receiptCount += 1;
    prev.totalQuantity += receipt.quantity;
    if (!prev.lastReceivedAt || new Date(receipt.receivedAt) > new Date(prev.lastReceivedAt)) {
      prev.lastReceivedAt = receipt.receivedAt;
      prev.lastUnitCost = receipt.unitCost;
    }
    supplierMap.set(receipt.supplierId, prev);
  }

  return Array.from(supplierMap.values()).sort(
    (a, b) => new Date(b.lastReceivedAt || 0) - new Date(a.lastReceivedAt || 0)
  );
}

/**
 * Resumen de costo/recepciones para la ficha del producto.
 *
 * `catalogAverageCost` (Product.costPrice) es la única cifra de "costo promedio": un promedio
 * móvil que se recalcula en cada recepción y se resetea al costo nuevo cuando el stock llega a 0
 * (`weightedAverageCost` en `inventory.helpers.js`) — es lo que usan márgenes y reportes.
 *
 * Antes esta función también devolvía `averageCostFromReceipts`, un promedio ponderado de TODAS
 * las recepciones históricas sin importar cuánto stock queda. Tras vender el stock y recomprar a
 * otro precio, `Product.costPrice` se reseteaba (correcto: valúa el inventario actual) pero ese
 * segundo promedio seguía arrastrando compras ya agotadas, así que las dos cifras dejaban de
 * coincidir y confundían en la ficha del producto. Se quitó: no tenía un dueño claro distinto del
 * costo de catálogo.
 *
 * @param {Array<{ quantity: number, unitCost: number, receivedAt?: Date|string|null }>} receipts
 * @param {number|null|undefined} catalogCostPrice
 */
export function buildCostSummaryFromReceipts(receipts = [], catalogCostPrice = null) {
  const totalReceivedQuantity = receipts.reduce((sum, r) => sum + r.quantity, 0);

  return {
    catalogAverageCost: catalogCostPrice != null ? Number(catalogCostPrice) : null,
    totalReceivedQuantity,
    receiptCount: receipts.length,
    lastUnitCost: receipts[0]?.unitCost ?? null,
    lastReceivedAt: receipts[0]?.receivedAt ?? null,
  };
}
