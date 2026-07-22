import prisma from '../lib/prisma.js';

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeSupplierName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

function cleanOptional(value) {
  const cleaned = String(value ?? '').trim();
  return cleaned || null;
}

function supplierData(data, { partial = false } = {}) {
  const result = {};
  if (!partial || data.name !== undefined) {
    const name = String(data.name || '').trim().replace(/\s+/g, ' ');
    if (!name) throw httpError('El nombre del proveedor es obligatorio.');
    result.name = name;
    result.normalizedName = normalizeSupplierName(name);
  }
  for (const field of ['taxId', 'contactName', 'email', 'phone', 'address', 'notes']) {
    if (!partial || data[field] !== undefined) result[field] = cleanOptional(data[field]);
  }
  if (partial && data.isActive !== undefined) {
    result.isActive = data.isActive === true || data.isActive === 'true';
  }
  return result;
}

export const getAll = async ({ search = '', active, limit = 50, offset = 0 } = {}) => {
  const take = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const skip = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const term = String(search || '').trim();
  const where = {
    ...(active === 'true' || active === true ? { isActive: true } : {}),
    ...(active === 'false' || active === false ? { isActive: false } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { contactName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { taxId: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, take, skip }),
    prisma.supplier.count({ where }),
  ]);
  return { data, total, limit: take, offset: skip };
};

export const getById = (id) =>
  prisma.supplier.findUnique({ where: { id: Number.parseInt(id, 10) } });

export const create = async (data, createdBy) => {
  const normalized = supplierData(data);
  const exists = await prisma.supplier.findUnique({
    where: { normalizedName: normalized.normalizedName },
  });
  if (exists) throw httpError('Ya existe un proveedor con ese nombre.', 409);
  if (normalized.taxId) {
    const taxIdExists = await prisma.supplier.findUnique({ where: { taxId: normalized.taxId } });
    if (taxIdExists) throw httpError('Ya existe un proveedor con esa identificación fiscal.', 409);
  }
  return prisma.supplier.create({
    data: { ...normalized, createdBy: createdBy || null },
  });
};

export const update = async (id, data) => {
  const supplierId = Number.parseInt(id, 10);
  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) throw httpError('Proveedor no encontrado.', 404);
  const patch = supplierData(data, { partial: true });
  if (patch.normalizedName && patch.normalizedName !== existing.normalizedName) {
    const duplicate = await prisma.supplier.findUnique({
      where: { normalizedName: patch.normalizedName },
    });
    if (duplicate) throw httpError('Ya existe un proveedor con ese nombre.', 409);
  }
  if (patch.taxId && patch.taxId !== existing.taxId) {
    const duplicate = await prisma.supplier.findUnique({ where: { taxId: patch.taxId } });
    if (duplicate) throw httpError('Ya existe un proveedor con esa identificación fiscal.', 409);
  }
  return prisma.supplier.update({ where: { id: supplierId }, data: patch });
};

export const remove = async (id) => {
  const supplierId = Number.parseInt(id, 10);
  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) throw httpError('Proveedor no encontrado.', 404);
  return prisma.supplier.update({
    where: { id: supplierId },
    data: { isActive: false },
  });
};
