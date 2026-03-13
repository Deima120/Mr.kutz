/**
 * Service (catalog) - Lógica de negocio de servicios (Prisma)
 */

import prisma from '../lib/prisma.js';

const toServiceDto = (s) =>
  s
    ? {
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration_minutes: s.durationMinutes,
        is_active: s.isActive,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }
    : null;

export const getAll = async ({ activeOnly = true } = {}) => {
  const services = await prisma.service.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
  });
  return services.map(toServiceDto);
};

export const getById = async (id) => {
  const service = await prisma.service.findUnique({
    where: { id: parseInt(id, 10) },
  });
  return toServiceDto(service);
};

export const create = async (data) => {
  const service = await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      durationMinutes: parseInt(data.durationMinutes, 10),
    },
  });
  return toServiceDto(service);
};

export const update = async (id, data) => {
  const service = await prisma.service.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: data.name,
      description: data.description,
      price: data.price != null ? parseFloat(data.price) : undefined,
      durationMinutes: data.durationMinutes != null ? parseInt(data.durationMinutes, 10) : undefined,
      isActive: data.isActive,
    },
  });
  return toServiceDto(service);
};

export const remove = async (id) => {
  const deleted = await prisma.service.delete({
    where: { id: parseInt(id, 10) },
  });
  return !!deleted;
};
