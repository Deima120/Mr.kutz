/**
 * Categorías de servicio (Cortes, Barba, Combos, Cejas…).
 *
 * El modelo ya existía y el seed ya las sembraba, pero no había forma de
 * gestionarlas: solo se podían elegir de un desplegable, y nacían de rebote
 * cuando el alta de un servicio mencionaba un nombre que no existía. Este módulo
 * replica el patrón de las categorías de producto, que ya funcionaba.
 *
 * Al borrar una categoría, sus servicios **no se borran**: se quedan sin
 * categoría, porque `Service.categoryId` es opcional con `onDelete: SetNull`. Por
 * eso el borrado devuelve cuántos servicios quedan afectados, para poder avisar
 * antes de confirmar.
 */

import prisma from '../lib/prisma.js';

const httpError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toDto = (row) =>
  row
    ? {
        id: row.id,
        name: row.name,
        description: row.description,
        is_active: row.isActive,
        service_count: row._count?.services ?? 0,
      }
    : null;

const includeCount = { _count: { select: { services: true } } };

const normalizeName = (value) => {
  const nombre = String(value ?? '').trim();
  if (!nombre) throw httpError('Indica el nombre de la categoría.');
  if (nombre.length > 100) throw httpError('El nombre no puede superar los 100 caracteres.');
  return nombre;
};

const normalizeDescription = (value) => {
  if (value === null) return null;
  const texto = String(value ?? '').trim();
  if (!texto) return null;
  return texto.slice(0, 255);
};

/**
 * El `@unique` de Prisma distingue mayúsculas, así que «Combos» y «combos»
 * cabrían las dos. Se comprueba sin distinguirlas para no acabar con duplicados
 * que en la pantalla parecen el mismo.
 */
async function assertNameLibre(nombre, excludeId = null) {
  const existe = await prisma.serviceCategory.findFirst({
    where: {
      name: { equals: nombre, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existe) throw httpError('Ya existe una categoría con ese nombre.', 409);
}

export const getAll = async ({ activeOnly = true } = {}) => {
  const rows = await prisma.serviceCategory.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
    include: includeCount,
  });
  return rows.map(toDto);
};

export const getById = async (id) => {
  const row = await prisma.serviceCategory.findUnique({
    where: { id: parseInt(id, 10) },
    include: includeCount,
  });
  return toDto(row);
};

export const create = async (data) => {
  const name = normalizeName(data.name);
  await assertNameLibre(name);

  const row = await prisma.serviceCategory.create({
    data: {
      name,
      description: normalizeDescription(data.description),
      isActive: data.isActive ?? true,
    },
    include: includeCount,
  });
  return toDto(row);
};

export const update = async (id, data) => {
  const cid = parseInt(id, 10);
  const actual = await prisma.serviceCategory.findUnique({ where: { id: cid } });
  if (!actual) throw httpError('Categoría no encontrada.', 404);

  const patch = {};
  if (data.name !== undefined) {
    const name = normalizeName(data.name);
    await assertNameLibre(name, cid);
    patch.name = name;
  }
  if (data.description !== undefined) patch.description = normalizeDescription(data.description);
  if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);

  if (Object.keys(patch).length === 0) return getById(cid);

  const row = await prisma.serviceCategory.update({
    where: { id: cid },
    data: patch,
    include: includeCount,
  });
  return toDto(row);
};

export const remove = async (id) => {
  const cid = parseInt(id, 10);
  const categoria = await prisma.serviceCategory.findUnique({
    where: { id: cid },
    include: includeCount,
  });
  if (!categoria) throw httpError('Categoría no encontrada.', 404);

  const afectados = categoria._count?.services ?? 0;
  await prisma.serviceCategory.delete({ where: { id: cid } });

  return { deleted: true, service_count_affected: afectados };
};
