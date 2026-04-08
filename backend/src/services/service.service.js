/**
 * Service (catalog) - Lógica de negocio de servicios (Prisma)
 */

import prisma from '../lib/prisma.js';

/** Sin categorías legacy General/Barbas; por defecto Cortes. */
function resolveCategoryLabel(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 'Cortes';
  const n = s.toLowerCase();
  if (n === 'general') return 'Cortes';
  if (n === 'barbas') return 'Barba';
  return s;
}

const toServiceDto = (s) =>
  s
    ? {
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration_minutes: s.durationMinutes,
        is_active: s.isActive,
        category_name: s.category?.name ?? 'Cortes',
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }
    : null;

/** Categorías activas para la web pública (sin auth). */
const isExcludedPublicCategoryName = (name) => {
  const n = String(name || '')
    .trim()
    .toLowerCase();
  return n === 'general' || n === 'barbas';
};

export const listPublicCategories = async () => {
  const rows = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return rows.filter((r) => !isExcludedPublicCategoryName(r.name));
};

export const getAll = async ({ activeOnly = true } = {}) => {
  const services = await prisma.service.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
    include: { category: true },
  });
  return services.map(toServiceDto);
};

export const getById = async (id) => {
  const service = await prisma.service.findUnique({
    where: { id: parseInt(id, 10) },
    include: { category: true },
  });
  return toServiceDto(service);
};

export const create = async (data) => {
  const name = String(data.name || '').trim();
  const categoryLabel = resolveCategoryLabel(data.categoryName || data.category);

  // Resolver/canonizar categoría (evitar duplicados por nombre ignorando mayúsculas)
  const existingCategory = await prisma.serviceCategory.findFirst({
    where: { name: { equals: categoryLabel, mode: 'insensitive' } },
  });
  const category =
    existingCategory ||
    (await prisma.serviceCategory.create({
      data: {
        name: categoryLabel,
      },
    }));

  // Evitar crear servicios duplicados por nombre dentro de la misma categoría
  const duplicate = await prisma.service.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      categoryId: category.id,
    },
  });

  if (duplicate) {
    const err = new Error(`Ya existe un servicio "${duplicate.name}" en la categoría "${category.name}".`);
    err.statusCode = 409;
    throw err;
  }

  const service = await prisma.service.create({
    data: {
      name,
      description: data.description,
      price: parseFloat(data.price),
      durationMinutes: parseInt(data.durationMinutes, 10),
      categoryId: category?.id ?? null,
    },
    include: { category: true },
  });
  return toServiceDto(service);
};

export const update = async (id, data) => {
  const serviceId = parseInt(id, 10);

  const name = data.name != null ? String(data.name || '').trim() : undefined;
  const categoryName = data.categoryName != null ? String(data.categoryName || '').trim() : undefined;

  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!existing) return null;

  let nextCategoryId = existing.categoryId;
  if (categoryName != null) {
    const resolvedLabel = resolveCategoryLabel(categoryName);
    const existingCategory = await prisma.serviceCategory.findFirst({
      where: { name: { equals: resolvedLabel, mode: 'insensitive' } },
    });
    const category =
      existingCategory ||
      (await prisma.serviceCategory.create({
        data: { name: resolvedLabel },
      }));
    nextCategoryId = category?.id ?? null;
  }

  const duplicate = await prisma.service.findFirst({
    where: {
      id: { not: serviceId },
      ...(name
        ? {
            name: { equals: name, mode: 'insensitive' },
          }
        : { name: { equals: existing.name, mode: 'insensitive' } }),
      categoryId: nextCategoryId,
    },
  });

  if (duplicate) {
    const err = new Error(`Ya existe un servicio duplicado en esa categoría.`);
    err.statusCode = 409;
    throw err;
  }

  const service = await prisma.service.update({
    where: { id: serviceId },
    data: {
      name: name != null ? name : undefined,
      description: data.description,
      price: data.price != null ? parseFloat(data.price) : undefined,
      durationMinutes: data.durationMinutes != null ? parseInt(data.durationMinutes, 10) : undefined,
      isActive: data.isActive,
      categoryId: categoryName != null ? nextCategoryId : undefined,
    },
    include: { category: true },
  });
  return toServiceDto(service);
};

export const remove = async (id) => {
  const deleted = await prisma.service.delete({
    where: { id: parseInt(id, 10) },
  });
  return !!deleted;
};
