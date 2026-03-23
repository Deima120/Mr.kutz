/**
 * Product & Inventory Service (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getAll = async ({ activeOnly = true, lowStockOnly = false, search = '' } = {}) => {
  const where = {};
  if (activeOnly) where.isActive = true;
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { sku: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      inventory: true,
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  let results = products.map((p) => ({
    ...p,
    quantity: p.inventory?.quantity ?? 0,
    stock_updated_at: p.inventory?.lastUpdated ?? null,
    category_name: p.category?.name ?? null,
  }));

  if (lowStockOnly) {
    results = results.filter((p) => (p.inventory?.quantity ?? 0) <= (p.minStock ?? 0));
  }

  return results;
};

export const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id, 10) },
    include: { inventory: true, category: true },
  });
  if (!product) return null;
  return {
    ...product,
    quantity: product.inventory?.quantity ?? 0,
    stock_updated_at: product.inventory?.lastUpdated ?? null,
    category_name: product.category?.name ?? null,
  };
};

export const getLowStock = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { inventory: true },
    orderBy: { name: 'asc' },
  });
  return products
    .filter((p) => (p.inventory?.quantity ?? 0) <= (p.minStock ?? 0))
    .sort((a, b) => (a.inventory?.quantity ?? 0) - (b.inventory?.quantity ?? 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      min_stock: p.minStock,
      quantity: p.inventory?.quantity ?? 0,
    }));
};

export const create = async (data) => {
  const { name, description, sku, unit, minStock, categoryId } = data;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        description: description || null,
        sku: sku || null,
        unit: unit || 'unit',
        minStock: minStock ?? 0,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
      },
    });
    await tx.inventory.create({
      data: { productId: product.id, quantity: 0 },
    });
    return product;
  });

  return { ...result, quantity: 0 };
};

export const update = async (id, data) => {
  const product = await prisma.product.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: data.name,
      description: data.description,
      sku: data.sku,
      unit: data.unit,
      minStock: data.minStock,
      isActive: data.isActive,
      categoryId: data.categoryId ? parseInt(data.categoryId, 10) : null,
    },
  });
  return product;
};

export const updateStock = async (productId, quantityChange, movementType, notes, createdBy) => {
  const result = await prisma.$transaction(async (tx) => {
    let inv = await tx.inventory.findUnique({
      where: { productId: parseInt(productId, 10) },
    });
    if (!inv) {
      await tx.inventory.create({
        data: { productId: parseInt(productId, 10), quantity: 0 },
      });
      inv = { quantity: 0 };
    }

    const updated = await tx.inventory.update({
      where: { productId: parseInt(productId, 10) },
      data: {
        quantity: { increment: quantityChange },
      },
    });

    if (updated.quantity < 0) {
      throw new Error('Stock cannot be negative');
    }

    await tx.inventoryMovement.create({
      data: {
        productId: parseInt(productId, 10),
        quantityChange,
        movementType: movementType || 'adjustment',
        notes: notes || null,
        createdBy: createdBy || null,
      },
    });

    return updated;
  });

  return getById(productId);
};

export const remove = async (id) => {
  await prisma.product.delete({
    where: { id: parseInt(id, 10) },
  });
  return true;
};

export const getMovements = async (productId, limit = 50) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: parseInt(productId, 10) },
    include: { creator: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return movements.map((m) => ({
    id: m.id,
    product_id: m.productId,
    quantity_change: m.quantityChange,
    movement_type: m.movementType,
    notes: m.notes,
    created_at: m.createdAt,
    created_by_email: m.creator?.email,
  }));
};
