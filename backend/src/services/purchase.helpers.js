const MAX_ITEMS = 100;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function requiredPositiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw validationError(`${field} debe ser un entero positivo.`);
  }
  return parsed;
}

function requiredPositiveAmount(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw validationError(`${field} debe ser un número mayor que cero.`);
  }
  return Number(parsed.toFixed(2));
}

function assertItemsArray(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw validationError('Debes incluir al menos un artículo.');
  }
  if (items.length > MAX_ITEMS) {
    throw validationError(`Máximo ${MAX_ITEMS} artículos por operación.`);
  }
}

export function normalizeOrderItems(items) {
  assertItemsArray(items);
  const seenProducts = new Set();
  return items.map((item, index) => {
    const productId = requiredPositiveInteger(item.productId, `items[${index}].productId`);
    if (seenProducts.has(productId)) {
      throw validationError(`El producto #${productId} está repetido en la orden.`);
    }
    seenProducts.add(productId);
    const quantity = requiredPositiveInteger(item.quantity, `items[${index}].quantity`);
    const unitCost = requiredPositiveAmount(item.unitCost, `items[${index}].unitCost`);
    return {
      productId,
      quantity,
      unitCost,
      subtotal: Number((quantity * unitCost).toFixed(2)),
    };
  });
}

export function normalizeReceiptItems(items) {
  assertItemsArray(items);
  const seenPurchaseItems = new Set();
  return items.map((item, index) => {
    const purchaseItemId = requiredPositiveInteger(
      item.purchaseItemId ?? item.purchase_item_id,
      `items[${index}].purchaseItemId`
    );
    if (seenPurchaseItems.has(purchaseItemId)) {
      throw validationError(`El artículo de orden #${purchaseItemId} está repetido.`);
    }
    seenPurchaseItems.add(purchaseItemId);
    const quantity = requiredPositiveInteger(item.quantity, `items[${index}].quantity`);
    const unitCost = requiredPositiveAmount(
      item.unitCost,
      `items[${index}].unitCost`
    );
    return { purchaseItemId, quantity, unitCost };
  });
}

export function derivePurchaseStatus(items) {
  const ordered = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const received = items.reduce(
    (sum, item) => sum + Number(item.receivedQuantity || 0),
    0
  );
  if (received <= 0) return 'ordered';
  if (received >= ordered) return 'received';
  return 'partially_received';
}
