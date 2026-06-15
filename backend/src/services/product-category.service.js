import prisma from '../lib/prisma.js';
import { toCategoryDto } from './product.dto.js';

export const getAll = async ({ activeOnly = true } = {}) => {
  const where = activeOnly ? { isActive: true } : {};
  const rows = await prisma.productCategory.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });
  return rows.map(toCategoryDto);
};

export const getById = async (id) => {
  const row = await prisma.productCategory.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      _count: { select: { products: true } },
    },
  });
  return toCategoryDto(row);
};

export const create = async (data) => {
  const row = await prisma.productCategory.create({
    data: {
      name: data.name,
      description: data.description || null,
      isActive: data.isActive ?? true,
    },
    include: {
      _count: { select: { products: true } },
    },
  });
  return toCategoryDto(row);
};

export const update = async (id, data) => {
  const patch = {};
  if (data.name !== undefined) patch.name = String(data.name).trim();
  if (data.description !== undefined) {
    patch.description =
      data.description != null && String(data.description).trim() !== ''
        ? String(data.description).trim()
        : null;
  }
  if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
  if (Object.keys(patch).length === 0) {
    return getById(id);
  }
  const row = await prisma.productCategory.update({
    where: { id: parseInt(id, 10) },
    data: patch,
    include: {
      _count: { select: { products: true } },
    },
  });
  return toCategoryDto(row);
};

export const remove = async (id) => {
  const cid = parseInt(id, 10);
  const category = await prisma.productCategory.findUnique({
    where: { id: cid },
    include: {
      _count: { select: { products: true } },
    },
  });
  if (!category) {
    const err = new Error('Categoría no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const productCount = category._count?.products ?? 0;
  await prisma.productCategory.delete({ where: { id: cid } });

  return {
    deleted: true,
    product_count_affected: productCount,
  };
};
