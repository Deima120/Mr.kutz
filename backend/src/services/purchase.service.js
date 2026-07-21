import prisma from '../lib/prisma.js';
import {
  changeStockAtomic,
  ensureInventory,
  weightedAverageCost,
} from './inventory.helpers.js';

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

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
  items_count: p._count?.items ?? p.items?.length ?? 0,
  items: (p.items || []).map((i) => ({
    id: i.id,
    product_id: i.productId,
    product_name: i.product?.name,
    quantity: i.quantity,
    unit_cost: i.unitCost,
    subtotal: i.subtotal,
  })),
});

function buildPurchasesWhere({ dateFrom, dateTo, status, search }) {
  const where = {};

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  const term = String(search || '').trim();
  if (term) {
    where.OR = [
      { supplierName: { contains: term, mode: 'insensitive' } },
      { invoiceNumber: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
    ];
  }

  return where;
}

const purchaseListInclude = {
  creator: { select: { email: true } },
  _count: { select: { items: true } },
};

const purchaseDetailInclude = {
  creator: { select: { email: true } },
  items: { include: { product: { select: { name: true } } } },
};

export const getAll = async ({
  dateFrom,
  dateTo,
  status,
  search,
  limit = 20,
  offset = 0,
}) => {
  const where = buildPurchasesWhere({ dateFrom, dateTo, status, search });
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: purchaseListInclude,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    purchases: rows.map(toDto),
    total,
    limit: take,
    offset: skip,
  };
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const where = { voidedAt: null };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const result = await prisma.purchase.aggregate({
    where,
    _sum: { totalAmount: true },
    _count: true,
  });

  return {
    total: result._sum?.totalAmount ?? 0,
    count: result._count ?? 0,
  };
};

export const getById = async (id) => {
  const row = await prisma.purchase.findUnique({
    where: { id: parseInt(id, 10) },
    include: purchaseDetailInclude,
  });
  if (!row) return null;
  const dto = toDto(row);
  dto.items_count = dto.items.length;
  return dto;
};

export const create = async (data, userId) => {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    throw httpError('La compra debe incluir al menos un artículo.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const normalized = [];
    for (const it of items) {
      const productId = parseInt(it.productId, 10);
      const quantity = parseInt(it.quantity, 10);
      const unitCost = Number(it.unitCost);
      if (!productId || quantity <= 0 || Number.isNaN(unitCost) || unitCost < 0) {
        throw httpError('Artículo de compra no válido.', 400);
      }
      normalized.push({
        productId,
        quantity,
        unitCost,
        subtotal: Number((quantity * unitCost).toFixed(2)),
      });
    }

    const productIds = [...new Set(normalized.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, isActive: true, costPrice: true, name: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const pid of productIds) {
      const product = productById.get(pid);
      if (!product) {
        throw httpError(`Producto #${pid} no encontrado.`, 404);
      }
      if (!product.isActive) {
        throw httpError(
          `No se puede registrar una compra del producto inactivo «${product.name || pid}».`,
          400
        );
      }
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
      const product = productById.get(item.productId);
      const inventory = await ensureInventory(tx, item.productId);
      const oldQty = inventory.quantity;
      const oldCost = product?.costPrice != null ? Number(product.costPrice) : null;
      const newCost = weightedAverageCost(oldQty, oldCost, item.quantity, item.unitCost);

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal: item.subtotal,
        },
      });

      await changeStockAtomic(tx, {
        productId: item.productId,
        quantityChange: item.quantity,
        movementType: 'purchase',
        notes: data.notes || `Ingreso por compra #${purchase.id}`,
        createdBy: userId || null,
      });

      if (newCost != null) {
        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: newCost },
        });
        productById.set(item.productId, {
          ...product,
          costPrice: newCost,
        });
      }
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
      await changeStockAtomic(tx, {
        productId: item.productId,
        quantityChange: -item.quantity,
        movementType: 'adjustment',
        notes: `Salida por anulación de compra #${pid}`,
        createdBy: Number.isFinite(voidedById) ? voidedById : null,
        insufficientMessage: `No hay stock suficiente para anular esta compra (producto #${item.productId}).`,
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
