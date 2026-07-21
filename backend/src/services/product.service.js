/**
 * Product & Inventory Service (Prisma)
 */

import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import {
  assertCategoryAssignable,
  assertManualMovement,
  changeStockAtomic,
  lockProducts,
  reverseMovementAtomic,
  runSerializable,
} from './inventory.helpers.js';
import { toProductDto, toMovementDto } from './product.dto.js';

/** SKU único automático (prefijo MK + sufijo alfanumérico). */
async function generateUniqueSku(tx) {
  const prefix = 'MK';
  for (let i = 0; i < 40; i += 1) {
    const part = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const sku = `${prefix}-${part.slice(0, 12)}`;
    const exists = await tx.product.findUnique({ where: { sku } });
    if (!exists) return sku;
  }
  const err = new Error('No se pudo generar un SKU único. Intenta de nuevo.');
  err.statusCode = 500;
  throw err;
}

function mapProductRow(p) {
  return toProductDto(p);
}

function buildProductWhere({ activeOnly, search, categoryId }) {
  const where = {};
  if (activeOnly) where.isActive = true;
  const cid = categoryId != null && categoryId !== '' ? parseInt(categoryId, 10) : null;
  if (Number.isFinite(cid) && cid > 0) where.categoryId = cid;
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { sku: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }
  return where;
}

async function getLowStockPaginated({ activeOnly, search, categoryId, take, skip }) {
  const parts = [Prisma.sql`COALESCE(i.quantity, 0) <= p."min_stock"`];
  if (activeOnly) parts.push(Prisma.sql`p."is_active" = true`);
  const cid = categoryId != null && categoryId !== '' ? parseInt(categoryId, 10) : null;
  if (Number.isFinite(cid) && cid > 0) parts.push(Prisma.sql`p."category_id" = ${cid}`);
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    parts.push(Prisma.sql`(p.name ILIKE ${term} OR p.sku ILIKE ${term})`);
  }
  const whereClause = Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;

  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "Product" p
    LEFT JOIN "Inventory" i ON i."product_id" = p.id
    ${whereClause}
  `;
  const total = Number(countRows[0]?.count ?? 0);

  const idRows = await prisma.$queryRaw`
    SELECT p.id
    FROM "Product" p
    LEFT JOIN "Inventory" i ON i."product_id" = p.id
    ${whereClause}
    ORDER BY COALESCE(i.quantity, 0) ASC, p.name ASC
    LIMIT ${take} OFFSET ${skip}
  `;
  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) {
    return { data: [], total, limit: take, offset: skip };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { inventory: true, category: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  return {
    data: ordered.map(mapProductRow),
    total,
    limit: take,
    offset: skip,
  };
}

async function getInventoryValuation() {
  try {
    const valuationRows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(COALESCE(i.quantity, 0) * COALESCE(p."cost_price", 0)), 0)::float AS value
      FROM "Product" p
      LEFT JOIN "Inventory" i ON i."product_id" = p.id
      WHERE p."is_active" = true
    `;
    return Number(valuationRows[0]?.value ?? 0);
  } catch (err) {
    console.error('[inventory] Valuation query failed:', err.message);
    return 0;
  }
}

async function getInventorySummary() {
  const [unitRows, lowStockCount, inventoryValue] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM(COALESCE(i.quantity, 0)), 0)::int AS total
      FROM "Product" p
      LEFT JOIN "Inventory" i ON i."product_id" = p.id
      WHERE p."is_active" = true
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Product" p
      LEFT JOIN "Inventory" i ON i."product_id" = p.id
      WHERE p."is_active" = true
        AND COALESCE(i.quantity, 0) <= p."min_stock"
    `,
    getInventoryValuation(),
  ]);
  return {
    totalUnits: Number(unitRows[0]?.total ?? 0),
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    inventoryValue,
  };
}

export const getInventoryInsights = async () => {
  const [summary, lowStockAlerts] = await Promise.all([
    getInventorySummary(),
    getLowStock(),
  ]);
  return {
    ...summary,
    lowStockAlerts: lowStockAlerts.slice(0, 10),
  };
};

function parseOptionalPrice(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const getAll = async ({
  activeOnly = true,
  lowStockOnly = false,
  search = '',
  categoryId,
  limit = 20,
  offset = 0,
} = {}) => {
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);

  const result = lowStockOnly
    ? await getLowStockPaginated({ activeOnly, search, categoryId, take, skip })
    : await (async () => {
        const where = buildProductWhere({ activeOnly, search, categoryId });
        const [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            include: { inventory: true, category: true },
            orderBy: { name: 'asc' },
            take,
            skip,
          }),
          prisma.product.count({ where }),
        ]);
        return {
          data: products.map(mapProductRow),
          total,
          limit: take,
          offset: skip,
        };
      })();

  const summary = await getInventorySummary();
  return { ...result, summary };
};

export const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id, 10) },
    include: { inventory: true, category: true },
  });
  if (!product) return null;
  return toProductDto(product);
};

export const getLowStock = async () => {
  const products = await prisma.$queryRaw`
    SELECT p.id, p.name, p."min_stock" as min_stock, COALESCE(i.quantity, 0) as quantity
    FROM "Product" p
    LEFT JOIN "Inventory" i ON i."product_id" = p.id
    WHERE p."is_active" = true
      AND COALESCE(i.quantity, 0) <= p."min_stock"
    ORDER BY COALESCE(i.quantity, 0) ASC, p.name ASC
  `;
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    min_stock: Number(p.min_stock),
    quantity: Number(p.quantity),
  }));
};

export const create = async (data) => {
  const { name, description, unit, minStock, categoryId, retailPrice, costPrice } = data;

  const result = await prisma.$transaction(async (tx) => {
    await assertCategoryAssignable(tx, categoryId);
    const sku = await generateUniqueSku(tx);
    const productData = {
        name,
        description: description || null,
        sku,
        unit: unit || 'unit',
        minStock: minStock ?? 0,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
      };
      const retail = parseOptionalPrice(retailPrice);
      const cost = parseOptionalPrice(costPrice);
      if (retail != null) productData.retailPrice = retail;
      if (cost != null) productData.costPrice = cost;

      const product = await tx.product.create({ data: productData });
    await tx.inventory.create({
      data: { productId: product.id, quantity: 0 },
    });
    return product;
  });

  return getById(result.id);
};

export const update = async (id, data) => {
  const pid = parseInt(id, 10);
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.unit !== undefined) patch.unit = data.unit;
  if (data.minStock !== undefined) patch.minStock = data.minStock;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.categoryId !== undefined) {
    patch.categoryId = data.categoryId ? parseInt(data.categoryId, 10) : null;
  }
  if (data.retailPrice !== undefined) {
    patch.retailPrice = parseOptionalPrice(data.retailPrice);
  }
  if (data.costPrice !== undefined) {
    patch.costPrice = parseOptionalPrice(data.costPrice);
  }

  await prisma.$transaction(async (tx) => {
    if (data.categoryId !== undefined) {
      await assertCategoryAssignable(tx, data.categoryId);
    }
    await tx.product.update({
      where: { id: pid },
      data: patch,
    });
  });

  return getById(pid);
};

export const updateStock = async (productId, quantityChange, movementType, notes, createdBy) => {
  assertManualMovement(quantityChange, movementType);
  await runSerializable(prisma, async (tx) => {
    await lockProducts(tx, [productId]);
    await changeStockAtomic(tx, {
      productId,
      quantityChange,
      movementType,
      sourceType: 'manual_adjustment',
      notes,
      createdBy,
      validateActiveProduct: true,
      insufficientMessage: 'El stock no puede ser negativo.',
    });
  });

  return getById(productId);
};

export const getMovements = async (productId, limit = 50) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: parseInt(productId, 10) },
    include: {
      creator: { select: { email: true } },
      voider: { select: { email: true } },
      goodsReceiptItem: {
        select: {
          goodsReceipt: {
            select: {
              id: true,
              receiptNumber: true,
              purchaseId: true,
              purchase: {
                select: {
                  orderNumber: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      payment: { select: { id: true, reference: true } },
      reversalOfMovement: { select: { id: true } },
      reversalMovement: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return movements.map(toMovementDto);
};

export const voidMovement = async (movementId, { voidReason, voidedBy } = {}) => {
  const mid = parseInt(movementId, 10);

  await runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "InventoryMovement" WHERE "id" = ${mid} FOR UPDATE`
    );
    const movement = await tx.inventoryMovement.findUnique({
      where: { id: mid },
    });
    if (!movement) {
      const err = new Error('Movimiento no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    if (
      !['adjustment', 'damage'].includes(movement.movementType) ||
      (movement.sourceType && movement.sourceType !== 'manual_adjustment')
    ) {
      const err = new Error('Solo se pueden anular ajustes manuales.');
      err.statusCode = 400;
      throw err;
    }
    const voidedById = voidedBy != null ? parseInt(voidedBy, 10) : null;
    await lockProducts(tx, [movement.productId]);
    await reverseMovementAtomic(tx, movement, {
      voidReason,
      voidedBy: Number.isFinite(voidedById) ? voidedById : null,
      notes: `Anulación del ajuste #${mid}`,
    });
  });

  return { voided: true, movement_id: mid };
};

export const importProducts = async (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error('No hay filas para importar.');
    err.statusCode = 400;
    throw err;
  }
  if (rows.length > 200) {
    const err = new Error('Máximo 200 productos por importación.');
    err.statusCode = 400;
    throw err;
  }

  const results = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 1;
    try {
      const name = String(row.name || '').trim();
      if (!name) throw new Error('Nombre obligatorio.');

      let categoryId = null;
      const categoryName = String(row.categoryName || row.category || row.categoria || '').trim();
      if (categoryName) {
        const cat = await prisma.productCategory.findFirst({
          where: { name: { equals: categoryName, mode: 'insensitive' }, isActive: true },
        });
        if (!cat) throw new Error(`Categoría "${categoryName}" no encontrada.`);
        categoryId = cat.id;
      }

      await create({
        name,
        description: row.description || row.descripcion || undefined,
        unit: row.unit || row.unidad || 'unit',
        minStock: row.minStock ?? row.min_stock ?? 0,
        categoryId,
        retailPrice: row.retailPrice ?? row.retail_price ?? row.precio_venta,
        costPrice: row.costPrice ?? row.cost_price ?? row.precio_costo,
      });
      results.created += 1;
    } catch (e) {
      results.failed += 1;
      results.errors.push({ line, message: e.message || 'Error al importar fila.' });
    }
  }

  return results;
};
