/**
 * Operaciones atómicas de stock compartidas entre productos, pagos y compras.
 */

import { Prisma } from '@prisma/client';

const SERIALIZABLE_RETRIES = 3;
const MANUAL_MOVEMENT_TYPES = new Set(['adjustment', 'damage']);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function assertManualMovement(quantityChange, movementType) {
  const quantity = Number(quantityChange);
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw httpError('El cambio de cantidad debe ser un entero distinto de cero.');
  }
  if (!MANUAL_MOVEMENT_TYPES.has(movementType)) {
    throw httpError('Los cambios manuales solo pueden ser adjustment o damage.');
  }
  if (movementType === 'damage' && quantity > 0) {
    throw httpError('Un movimiento damage debe disminuir el inventario.');
  }
}

export async function runSerializable(client, operation, maxRetries = SERIALIZABLE_RETRIES) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await client.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 30000,
      });
    } catch (error) {
      attempt += 1;
      if (error?.code !== 'P2034' || attempt >= maxRetries) throw error;
    }
  }
  throw httpError('No se pudo completar la operación concurrente.', 409);
}

export async function lockProducts(tx, productIds) {
  const ids = [...new Set(productIds.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
  if (ids.length === 0 || typeof tx.$queryRaw !== 'function') return;
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`
  );
}

/**
 * Costo promedio ponderado tras un ingreso de compra.
 * Si no hay stock previo con costo, usa el unitCost entrante.
 */
export function weightedAverageCost(oldQty, oldCost, addQty, unitCost) {
  const incoming = Number(unitCost);
  if (!Number.isFinite(incoming) || incoming <= 0) return null;
  if (!(oldQty > 0) || oldCost == null || !Number.isFinite(Number(oldCost))) {
    return Number(incoming.toFixed(2));
  }
  const prev = Number(oldCost);
  const qty = Number(addQty);
  if (!Number.isFinite(qty) || qty <= 0) return Number(prev.toFixed(2));
  return Number(((oldQty * prev + qty * incoming) / (oldQty + qty)).toFixed(2));
}

export async function ensureInventory(tx, productId) {
  const pid = parseInt(productId, 10);
  return tx.inventory.upsert({
    where: { productId: pid },
    create: { productId: pid, quantity: 0 },
    update: {},
  });
}

/**
 * Aplica un cambio de stock de forma atómica (decrementos con condición quantity >= qty).
 * Crea el movimiento de inventario en la misma transacción.
 */
export async function changeStockAtomic(
  tx,
  {
    productId,
    quantityChange,
    movementType = 'adjustment',
    notes = null,
    createdBy = null,
    validateActiveProduct = false,
    insufficientMessage = 'El stock no puede ser negativo.',
    sourceType = null,
    goodsReceiptItemId = null,
    paymentId = null,
    reversalOfMovementId = null,
  }
) {
  const pid = parseInt(productId, 10);
  const qty = parseInt(quantityChange, 10);

  if (!Number.isFinite(pid) || pid < 1) {
    throw httpError('Producto no válido.');
  }
  if (!Number.isFinite(qty) || qty === 0) {
    throw httpError('El cambio de cantidad debe ser distinto de cero.');
  }
  if (movementType === 'purchase' && qty < 0) {
    throw httpError('Un ingreso de compra debe aumentar el inventario.');
  }
  if (['sale', 'damage'].includes(movementType) && qty > 0) {
    throw httpError(`Un movimiento ${movementType} debe disminuir el inventario.`);
  }

  if (validateActiveProduct) {
    const product = await tx.product.findUnique({
      where: { id: pid },
      select: { id: true, isActive: true },
    });
    if (!product) {
      throw httpError('Producto no encontrado.', 404);
    }
    if (!product.isActive) {
      throw httpError('No se puede ajustar el stock de un producto inactivo.');
    }
  }

  const now = new Date();

  if (qty > 0) {
    await ensureInventory(tx, pid);
    await tx.inventory.update({
      where: { productId: pid },
      data: { quantity: { increment: qty }, lastUpdated: now },
    });
  } else {
    const decrement = Math.abs(qty);
    const result = await tx.inventory.updateMany({
      where: {
        productId: pid,
        quantity: { gte: decrement },
      },
      data: {
        quantity: { decrement },
        lastUpdated: now,
      },
    });
    if (result.count === 0) {
      throw httpError(insufficientMessage);
    }
  }

  return tx.inventoryMovement.create({
    data: {
      productId: pid,
      quantityChange: qty,
      movementType: movementType || 'adjustment',
      sourceType,
      goodsReceiptItemId,
      paymentId,
      reversalOfMovementId,
      notes: notes || null,
      createdBy: createdBy || null,
    },
  });
}

export async function reverseMovementAtomic(
  tx,
  movement,
  { voidReason = null, voidedBy = null, notes = null } = {}
) {
  const existingReversal = await tx.inventoryMovement.findUnique({
    where: { reversalOfMovementId: movement.id },
  });
  if (existingReversal) return existingReversal;

  if (movement.voidedAt) {
    throw httpError('Este movimiento ya está anulado.', 409);
  }

  const reversal = await changeStockAtomic(tx, {
    productId: movement.productId,
    quantityChange: -movement.quantityChange,
    movementType: 'reversal',
    sourceType: 'reversal',
    reversalOfMovementId: movement.id,
    notes: notes || `Reverso del movimiento #${movement.id}`,
    createdBy: voidedBy,
    insufficientMessage: 'No hay stock suficiente para revertir este movimiento.',
  });

  const updated = await tx.inventoryMovement.updateMany({
    where: { id: movement.id, voidedAt: null },
    data: {
      voidedAt: new Date(),
      voidReason: voidReason || null,
      voidedBy,
    },
  });
  if (updated.count !== 1) {
    throw httpError('El movimiento fue anulado por otra operación.', 409);
  }
  return reversal;
}

export async function assertCategoryAssignable(tx, categoryId) {
  if (categoryId == null || categoryId === '') return;
  const cid = parseInt(categoryId, 10);
  if (!Number.isFinite(cid) || cid < 1) return;

  const category = await tx.productCategory.findUnique({ where: { id: cid } });
  if (!category) {
    const err = new Error('Categoría no encontrada.');
    err.statusCode = 400;
    throw err;
  }
  if (!category.isActive) {
    const err = new Error('No se puede asignar una categoría inactiva.');
    err.statusCode = 400;
    throw err;
  }
}
