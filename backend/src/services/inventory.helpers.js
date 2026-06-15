/**
 * Operaciones atómicas de stock compartidas entre productos, pagos y compras.
 */

export async function ensureInventory(tx, productId) {
  const pid = parseInt(productId, 10);
  const existing = await tx.inventory.findUnique({ where: { productId: pid } });
  if (existing) return existing;
  return tx.inventory.create({ data: { productId: pid, quantity: 0 } });
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
  }
) {
  const pid = parseInt(productId, 10);
  const qty = parseInt(quantityChange, 10);

  if (!Number.isFinite(pid) || pid < 1) {
    const err = new Error('Producto no válido.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(qty) || qty === 0) {
    const err = new Error('El cambio de cantidad debe ser distinto de cero.');
    err.statusCode = 400;
    throw err;
  }

  if (validateActiveProduct) {
    const product = await tx.product.findUnique({
      where: { id: pid },
      select: { id: true, isActive: true },
    });
    if (!product) {
      const err = new Error('Producto no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    if (!product.isActive) {
      const err = new Error('No se puede ajustar el stock de un producto inactivo.');
      err.statusCode = 400;
      throw err;
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
      const err = new Error(insufficientMessage);
      err.statusCode = 400;
      throw err;
    }
  }

  await tx.inventoryMovement.create({
    data: {
      productId: pid,
      quantityChange: qty,
      movementType: movementType || 'adjustment',
      notes: notes || null,
      createdBy: createdBy || null,
    },
  });
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
