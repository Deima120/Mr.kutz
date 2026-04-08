import prisma from '../lib/prisma.js';

export const getAll = async ({ activeOnly = true } = {}) => {
  const where = activeOnly ? { isActive: true } : {};
  return prisma.productCategory.findMany({
    where,
    orderBy: { name: 'asc' },
  });
};

export const getById = async (id) => prisma.productCategory.findUnique({
  where: { id: parseInt(id, 10) },
});

export const create = async (data) => prisma.productCategory.create({
  data: {
    name: data.name,
    description: data.description || null,
    isActive: data.isActive ?? true,
  },
});

export const update = async (id, data) => prisma.productCategory.update({
  where: { id: parseInt(id, 10) },
  data: {
    name: data.name,
    description: data.description,
    isActive: data.isActive,
  },
});

export const remove = async (id) => {
  await prisma.productCategory.delete({ where: { id: parseInt(id, 10) } });
  return true;
};
