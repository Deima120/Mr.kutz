/**
 * Payment Service (Prisma)
 */

import prisma from '../lib/prisma.js';

function toPaymentRow(p) {
  return {
    id: p.id,
    appointment_id: p.appointmentId,
    product_id: p.productId,
    product_quantity: p.productQuantity,
    amount: p.amount,
    payment_method_id: p.paymentMethodId,
    reference: p.reference,
    notes: p.notes,
    created_at: p.createdAt,
    voided_at: p.voidedAt,
    void_reason: p.voidReason,
    voided_by: p.voidedBy,
    payment_method_name: p.paymentMethod?.name,
    appointment_date: p.appointment?.appointmentDate,
    start_time: p.appointment?.startTime,
    client_first_name: p.appointment?.client?.firstName,
    client_last_name: p.appointment?.client?.lastName,
    service_name: p.appointment?.service?.name,
    product_name: p.product?.name,
    product_sku: p.product?.sku,
  };
}

export const getPaymentMethods = async () => {
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true },
  });
  return methods;
};

export const getAll = async ({ dateFrom, dateTo, appointmentId, limit = 100, offset = 0 }) => {
  const where = {};
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo + 'T23:59:59.999Z') };
  if (appointmentId) where.appointmentId = parseInt(appointmentId, 10);

  const payments = await prisma.payment.findMany({
    where,
    include: {
      paymentMethod: { select: { name: true } },
      product: { select: { name: true, sku: true } },
      appointment: {
        select: {
          appointmentDate: true,
          startTime: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return payments.map(toPaymentRow);
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const where = { voidedAt: null };
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo + 'T23:59:59.999Z') };

  const result = await prisma.payment.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  });
  return {
    total: result._sum?.amount ?? 0,
    count: result._count ?? 0,
  };
};

export const getById = async (id) => {
  const p = await prisma.payment.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      paymentMethod: { select: { name: true } },
      product: { select: { id: true, name: true, sku: true } },
      appointment: {
        select: {
          appointmentDate: true,
          startTime: true,
          clientId: true,
          serviceId: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true, price: true } },
        },
      },
    },
  });
  if (!p) return null;
  const base = toPaymentRow(p);
  return {
    ...p,
    ...base,
    client_id: p.appointment?.clientId,
    service_id: p.appointment?.serviceId,
    service_price: p.appointment?.service?.price,
  };
};

export const create = async (data) => {
  const appointmentId = data.appointmentId ? parseInt(data.appointmentId, 10) : null;
  const productId = data.productId ? parseInt(data.productId, 10) : null;
  const productQuantity =
    data.productQuantity != null && data.productQuantity !== ''
      ? parseInt(data.productQuantity, 10)
      : null;

  if (productId && (!Number.isFinite(productQuantity) || productQuantity < 1)) {
    const err = new Error('Indica la cantidad vendida del producto.');
    err.statusCode = 400;
    throw err;
  }
  if (productId && appointmentId) {
    const err = new Error('Un pago no puede estar vinculado a una cita y a una venta de inventario a la vez.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    if (productId) {
      const inv = await tx.inventory.findUnique({ where: { productId } });
      const current = inv?.quantity ?? 0;
      if (current < productQuantity) {
        const err = new Error('Stock insuficiente para registrar esta venta.');
        err.statusCode = 400;
        throw err;
      }
      await tx.inventory.update({
        where: { productId },
        data: { quantity: { decrement: productQuantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          quantityChange: -productQuantity,
          movementType: 'sale',
          notes: data.notes || `Venta registrada (${productQuantity} uds.)`,
          createdBy: data.createdBy ? parseInt(data.createdBy, 10) : null,
        },
      });
    }

    const payment = await tx.payment.create({
      data: {
        appointmentId,
        productId: productId || null,
        productQuantity: productId ? productQuantity : null,
        amount: parseFloat(data.amount),
        paymentMethodId: data.paymentMethodId ? parseInt(data.paymentMethodId, 10) : null,
        reference: data.reference || null,
        notes: data.notes || null,
        createdBy: data.createdBy ? parseInt(data.createdBy, 10) : null,
      },
    });

    return tx.payment.findUnique({
      where: { id: payment.id },
      include: {
        paymentMethod: { select: { name: true } },
        product: { select: { name: true, sku: true } },
        appointment: {
          select: {
            appointmentDate: true,
            startTime: true,
            client: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
    });
  });
};

const paymentIncludeForRow = {
  paymentMethod: { select: { name: true } },
  product: { select: { name: true, sku: true } },
  appointment: {
    select: {
      appointmentDate: true,
      startTime: true,
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
  },
};

/**
 * Anula un pago (no borra el registro). Si era venta de inventario, devuelve el stock.
 */
export const voidPayment = async (id, { voidReason, voidedBy } = {}) => {
  const pid = parseInt(id, 10);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { id: pid } });
    if (!existing) {
      const err = new Error('Pago no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    if (existing.voidedAt) {
      const err = new Error('Este pago ya está anulado.');
      err.statusCode = 400;
      throw err;
    }

    const { productId } = existing;
    const pq = existing.productQuantity;
    if (productId && pq && pq > 0) {
      await tx.inventory.update({
        where: { productId },
        data: { quantity: { increment: pq } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          quantityChange: pq,
          movementType: 'adjustment',
          notes: `Devolución por anulación de pago #${pid}`,
          createdBy: voidedBy ? parseInt(voidedBy, 10) : null,
        },
      });
    }

    await tx.payment.update({
      where: { id: pid },
      data: {
        voidedAt: new Date(),
        voidReason: voidReason?.trim() ? voidReason.trim().slice(0, 500) : null,
        voidedBy: voidedBy ? parseInt(voidedBy, 10) : null,
      },
    });

    const updated = await tx.payment.findUnique({
      where: { id: pid },
      include: paymentIncludeForRow,
    });
    return toPaymentRow(updated);
  });
};
