/**
 * Testimonial Service — contenido editorial para la landing (tabla Testimonial).
 * La satisfacción medible por cita vive en Appointment (clientRating, etc.).
 */

import prisma from '../lib/prisma.js';

const toDto = (t) =>
  t
    ? {
        id: t.id,
        author_name: t.authorName,
        author_role: t.authorRole,
        content: t.content,
        is_active: t.isActive,
        sort_order: t.sortOrder,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }
    : null;

export const getAll = async ({ activeOnly = false } = {}) => {
  const list = await prisma.testimonial.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return list.map(toDto);
};

export const getById = async (id) => {
  const t = await prisma.testimonial.findUnique({
    where: { id: parseInt(id, 10) },
  });
  return toDto(t);
};

export const create = async (data) => {
  const t = await prisma.testimonial.create({
    data: {
      authorName: data.authorName,
      authorRole: data.authorRole || null,
      content: data.content,
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder != null ? parseInt(data.sortOrder, 10) : 0,
    },
  });
  return toDto(t);
};

export const update = async (id, data) => {
  const t = await prisma.testimonial.update({
    where: { id: parseInt(id, 10) },
    data: {
      authorName: data.authorName,
      authorRole: data.authorRole,
      content: data.content,
      isActive: data.isActive,
      sortOrder: data.sortOrder != null ? parseInt(data.sortOrder, 10) : undefined,
    },
  });
  return toDto(t);
};

export const remove = async (id) => {
  await prisma.testimonial.delete({
    where: { id: parseInt(id, 10) },
  });
  return true;
};
