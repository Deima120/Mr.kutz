import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import {
  changeStockAtomic,
  ensureInventory,
  lockProducts,
  runSerializable,
  weightedAverageCost,
} from './inventory.helpers.js';
import {
  derivePurchaseStatus,
  normalizeOrderItems,
  normalizeReceiptItems,
} from './purchase.helpers.js';

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function purchaseNumber(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `${prefix}-${date}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function cleanText(value, maxLength) {
  const cleaned = String(value ?? '').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

const detailInclude = {
  supplier: true,
  creator: { select: { email: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
      receiptItems: true,
    },
  },
  receipts: {
    include: {
      creator: { select: { email: true } },
      items: {
        include: {
          purchaseItem: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          movement: { select: { id: true } },
        },
      },
    },
    orderBy: { receivedAt: 'desc' },
  },
};

function receiptDto(receipt) {
  return {
    id: receipt.id,
    purchaseId: receipt.purchaseId,
    receiptNumber: receipt.receiptNumber,
    receivedAt: receipt.receivedAt,
    notes: receipt.notes,
    createdAt: receipt.createdAt,
    createdByEmail: receipt.creator?.email ?? null,
    items: (receipt.items || []).map((item) => ({
      id: item.id,
      purchaseItemId: item.purchaseItemId,
      productId: item.purchaseItem?.productId,
      productName: item.purchaseItem?.product?.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      inventoryMovementId: item.movement?.id ?? null,
    })),
  };
}

function toDto(p) {
  const supplierName = p.supplier?.name ?? p.supplierName ?? null;
  return {
    id: p.id,
    supplierId: p.supplierId,
    supplierName,
    supplier: p.supplier ?? null,
    orderNumber: p.orderNumber,
    invoiceNumber: p.invoiceNumber,
    status: p.status,
    orderedAt: p.orderedAt,
    expectedAt: p.expectedAt,
    notes: p.notes,
    totalAmount: p.totalAmount,
    voidedAt: p.voidedAt,
    voidReason: p.voidReason,
    voidedBy: p.voidedBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    createdByEmail: p.creator?.email ?? null,
    itemsCount: p._count?.items ?? p.items?.length ?? 0,
    items: (p.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      pendingQuantity: Math.max(0, item.quantity - item.receivedQuantity),
      unitCost: item.unitCost,
      subtotal: item.subtotal,
    })),
    receipts: (p.receipts || []).map(receiptDto),
  };
}

function buildWhere({ dateFrom, dateTo, status, search }) {
  const where = {};
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }
  if (status === 'active') where.status = { not: 'cancelled' };
  else if (status === 'voided') where.status = 'cancelled';
  else if (['draft', 'ordered', 'partially_received', 'received', 'cancelled'].includes(status)) {
    where.status = status;
  }
  const term = String(search || '').trim();
  if (term) {
    where.OR = [
      { orderNumber: { contains: term, mode: 'insensitive' } },
      { invoiceNumber: { contains: term, mode: 'insensitive' } },
      { supplier: { name: { contains: term, mode: 'insensitive' } } },
      { notes: { contains: term, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function resolveSupplier(tx, data) {
  const supplierId = Number.parseInt(data.supplierId, 10);
  if (!Number.isInteger(supplierId) || supplierId < 1) {
    throw httpError('Debes seleccionar un proveedor válido.');
  }
  const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw httpError('Proveedor no encontrado.', 404);
  if (!supplier.isActive) throw httpError('El proveedor está inactivo.');
  return supplier;
}

export const getAll = async ({
  dateFrom,
  dateTo,
  status,
  search,
  limit = 20,
  offset = 0,
}) => {
  const where = buildWhere({ dateFrom, dateTo, status, search });
  const take = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        creator: { select: { email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.purchase.count({ where }),
  ]);
  return { purchases: rows.map(toDto), total, limit: take, offset: skip };
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const where = { status: { not: 'cancelled' } };
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
  return { total: result._sum.totalAmount ?? 0, count: result._count ?? 0 };
};

export const getById = async (id) => {
  const row = await prisma.purchase.findUnique({
    where: { id: Number.parseInt(id, 10) },
    include: detailInclude,
  });
  return row ? toDto(row) : null;
};

export const create = async (data, userId) => {
  const items = normalizeOrderItems(data.items);
  const expectedAt = data.expectedAt ? new Date(data.expectedAt) : null;
  if (expectedAt && Number.isNaN(expectedAt.getTime())) {
    throw httpError('La fecha esperada no es válida.');
  }

  const row = await runSerializable(prisma, async (tx) => {
    const supplier = await resolveSupplier(tx, data);
    await lockProducts(tx, items.map((item) => item.productId));
    const products = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, name: true, isActive: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) throw httpError(`Producto #${item.productId} no encontrado.`, 404);
      if (!product.isActive) throw httpError(`El producto «${product.name}» está inactivo.`);
    }

    const totalAmount = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    return tx.purchase.create({
      data: {
        supplierId: supplier.id,
        supplierName: supplier.name,
        orderNumber: cleanText(data.orderNumber, 80) || purchaseNumber('PO'),
        invoiceNumber: cleanText(data.invoiceNumber, 80),
        expectedAt,
        notes: cleanText(data.notes, 1000),
        totalAmount,
        createdBy: userId || null,
        items: { create: items },
      },
      include: detailInclude,
    });
  });
  return toDto(row);
};

export const submit = async (id) => {
  const purchaseId = Number.parseInt(id, 10);
  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "purchases" WHERE "id" = ${purchaseId} FOR UPDATE`
    );
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { supplier: true, _count: { select: { items: true } } },
    });
    if (!purchase) throw httpError('Orden no encontrada.', 404);
    if (purchase.status !== 'draft') throw httpError('Solo una orden borrador puede enviarse.');
    if (!purchase.supplier.isActive) throw httpError('El proveedor está inactivo.');
    if (purchase._count.items < 1) throw httpError('La orden no tiene artículos.');
    const submitted = await tx.purchase.updateMany({
      where: { id: purchaseId, status: 'draft' },
      data: { status: 'ordered', orderedAt: new Date() },
    });
    if (submitted.count !== 1) throw httpError('La orden cambió de estado.', 409);
    const updated = await tx.purchase.findUnique({ where: { id: purchaseId }, include: detailInclude });
    return toDto(updated);
  });
};

export const cancel = async (id, { reason, userId } = {}) => {
  const purchaseId = Number.parseInt(id, 10);
  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "purchases" WHERE "id" = ${purchaseId} FOR UPDATE`);
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { _count: { select: { receipts: true } } },
    });
    if (!purchase) throw httpError('Orden no encontrada.', 404);
    if (purchase.status === 'cancelled') return toDto(
      await tx.purchase.findUnique({ where: { id: purchaseId }, include: detailInclude })
    );
    if (purchase._count.receipts > 0) {
      throw httpError('No se puede cancelar una orden con recepciones.');
    }
    const updated = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'cancelled',
        voidedAt: new Date(),
        voidReason: cleanText(reason, 500),
        voidedBy: userId || null,
      },
      include: detailInclude,
    });
    return toDto(updated);
  });
};

export const receive = async (id, data, userId) => {
  const purchaseId = Number.parseInt(id, 10);
  const requested = normalizeReceiptItems(data.items);
  const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();
  if (Number.isNaN(receivedAt.getTime())) throw httpError('Fecha de recepción no válida.');

  const row = await runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "purchases" WHERE "id" = ${purchaseId} FOR UPDATE`);
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    if (!purchase) throw httpError('Orden no encontrada.', 404);
    if (!['ordered', 'partially_received'].includes(purchase.status)) {
      throw httpError('La orden no está disponible para recepción.');
    }
    if (!purchase.supplier.isActive) throw httpError('El proveedor está inactivo.');

    const purchaseItems = new Map(purchase.items.map((item) => [item.id, item]));
    for (const item of requested) {
      const orderedItem = purchaseItems.get(item.purchaseItemId);
      if (!orderedItem) {
        throw httpError(`El artículo #${item.purchaseItemId} no pertenece a la orden.`);
      }
      if (!orderedItem.product.isActive) {
        throw httpError(`El producto «${orderedItem.product.name}» está inactivo.`);
      }
      const pending = orderedItem.quantity - orderedItem.receivedQuantity;
      if (item.quantity > pending) {
        throw httpError(
          `La cantidad de «${orderedItem.product.name}» excede el pendiente (${pending}).`
        );
      }
    }

    await lockProducts(
      tx,
      requested.map((item) => purchaseItems.get(item.purchaseItemId).productId)
    );

    const productIds = [...new Set(
      requested.map((item) => purchaseItems.get(item.purchaseItemId).productId)
    )];
    const lockedProducts = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true },
    });
    const productCosts = new Map(
      lockedProducts.map((product) => [
        product.id,
        product.costPrice == null ? null : Number(product.costPrice),
      ])
    );

    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseId,
        receiptNumber: cleanText(data.receiptNumber, 80) || purchaseNumber('GR'),
        receivedAt,
        notes: cleanText(data.notes, 1000),
        createdBy: userId || null,
      },
    });

    for (const requestedItem of requested) {
      const orderedItem = purchaseItems.get(requestedItem.purchaseItemId);
      const unitCost = requestedItem.unitCost;
      const inventory = await ensureInventory(tx, orderedItem.productId);
      const oldCost = productCosts.get(orderedItem.productId);
      const newCost = weightedAverageCost(
        inventory.quantity,
        oldCost,
        requestedItem.quantity,
        unitCost
      );

      const receiptItem = await tx.goodsReceiptItem.create({
        data: {
          goodsReceiptId: receipt.id,
          purchaseItemId: orderedItem.id,
          quantity: requestedItem.quantity,
          unitCost,
        },
      });
      await tx.purchaseItem.update({
        where: { id: orderedItem.id },
        data: { receivedQuantity: { increment: requestedItem.quantity } },
      });
      await changeStockAtomic(tx, {
        productId: orderedItem.productId,
        quantityChange: requestedItem.quantity,
        movementType: 'purchase',
        sourceType: 'goods_receipt',
        goodsReceiptItemId: receiptItem.id,
        notes: `Recepción ${receipt.receiptNumber} de orden ${purchase.orderNumber}`,
        createdBy: userId || null,
      });
      await tx.product.update({
        where: { id: orderedItem.productId },
        data: { costPrice: newCost },
      });
      productCosts.set(orderedItem.productId, newCost);
    }

    const refreshedItems = await tx.purchaseItem.findMany({ where: { purchaseId } });
    await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: derivePurchaseStatus(refreshedItems) },
    });
    return tx.purchase.findUnique({ where: { id: purchaseId }, include: detailInclude });
  });
  return toDto(row);
};
