import prisma from '../lib/prisma.js';

const toDto = (p) => ({
  id: p.id,
  supplier_name: p.supplierName,
  invoice_number: p.invoiceNumber,
  notes: p.notes,
  total_amount: p.totalAmount,
  voided_at: p.voidedAt,
  void_reason: p.voidReason,
  voided_by: p.voidedBy,
  created_at: p.createdAt,
  created_by_email: p.creator?.email,
  items: (p.items || []).map((i) => ({
    id: i.id,
    product_id: i.productId,
    product_name: i.product?.name,
    quantity: i.quantity,
    unit_cost: i.unitCost,
    subtotal: i.subtotal,
  })),
});

export const getAll = async () => {
  const rows = await prisma.purchase.findMany({
    include: {
      creator: { select: { email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
};

export const getById = async (id) => {
  const row = await prisma.purchase.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      creator: { select: { email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });
  return row ? toDto(row) : null;
};

export const create = async (data, userId) => {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) throw new Error('La compra debe incluir al menos un artículo.');

  const result = await prisma.$transaction(async (tx) => {
    const normalized = [];
    for (const it of items) {
      const productId = parseInt(it.productId, 10);
      const quantity = parseInt(it.quantity, 10);
      const unitCost = Number(it.unitCost);
      if (!productId || quantity <= 0 || Number.isNaN(unitCost) || unitCost < 0) {
        throw new Error('Artículo de compra no válido.');
      }
      normalized.push({
        productId,
        quantity,
        unitCost,
        subtotal: Number((quantity * unitCost).toFixed(2)),
      });
    }

    const totalAmount = Number(normalized.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2));

    const purchase = await tx.purchase.create({
      data: {
        supplierName: data.supplierName || null,
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
        totalAmount,
        createdBy: userId || null,
      },
    });

    for (const item of normalized) {
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: item.subtotal,
        },
      });

      const currentInv = await tx.inventory.findUnique({ where: { productId: item.productId } });
      if (!currentInv) {
        await tx.inventory.create({ data: { productId: item.productId, quantity: item.quantity } });
      } else {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          quantityChange: item.quantity,
          movementType: 'purchase',
          notes: data.notes || 'Ingreso por compra',
          createdBy: userId || null,
        },
      });
    }

    return tx.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        creator: { select: { email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  });

  return toDto(result);
};

/**
 * Anula una compra: descuenta del inventario las cantidades ingresadas (no borra el registro).
 */
export const voidPurchase = async (id, { voidReason, voidedBy } = {}) => {
  const pid = parseInt(id, 10);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchase.findUnique({
      where: { id: pid },
      include: { items: true },
    });
    if (!existing) {
      const err = new Error('Compra no encontrada.');
      err.statusCode = 404;
      throw err;
    }
    if (existing.voidedAt) {
      const err = new Error('Esta compra ya está anulada.');
      err.statusCode = 400;
      throw err;
    }
    if (!existing.items?.length) {
      const err = new Error('La compra no tiene artículos para revertir.');
      err.statusCode = 400;
      throw err;
    }

    const voidedById = voidedBy != null ? parseInt(voidedBy, 10) : null;

    for (const item of existing.items) {
      const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
      const current = inv?.quantity ?? 0;
      if (current < item.quantity) {
        const err = new Error(
          `No hay stock suficiente para anular esta compra (producto #${item.productId}: hay ${current}, se requieren ${item.quantity}).`
        );
        err.statusCode = 400;
        throw err;
      }
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          quantityChange: -item.quantity,
          movementType: 'adjustment',
          notes: `Salida por anulación de compra #${pid}`,
          createdBy: Number.isFinite(voidedById) ? voidedById : null,
        },
      });
    }

    await tx.purchase.update({
      where: { id: pid },
      data: {
        voidedAt: new Date(),
        voidReason: voidReason?.trim() ? voidReason.trim().slice(0, 500) : null,
        voidedBy: Number.isFinite(voidedById) ? voidedById : null,
      },
    });

    const updated = await tx.purchase.findUnique({
      where: { id: pid },
      include: {
        creator: { select: { email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
    return toDto(updated);
  });
};
