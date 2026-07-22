/**
 * Payment Service (Prisma)
 */

import prisma from '../lib/prisma.js';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  changeStockAtomic,
  lockProducts,
  reverseMovementAtomic,
  runSerializable,
} from './inventory.helpers.js';
import { assertVoidReason, normalizeOptionalAppointmentId } from './payment.rules.js';

const REFERENCE_PREFIX = 'MKP';

function cleanReference(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100).toUpperCase();
}

function buildReferenceCandidate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `${REFERENCE_PREFIX}-${yyyy}${mm}${dd}-${random}`;
}

async function getOrCreateReference(tx, requestedReference) {
  const provided = cleanReference(requestedReference);
  if (provided) return provided;

  for (let i = 0; i < 6; i += 1) {
    const candidate = buildReferenceCandidate();
    const existing = await tx.payment.findFirst({
      where: { reference: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  const err = new Error('No se pudo generar una referencia de pago. Intenta de nuevo.');
  err.statusCode = 503;
  throw err;
}

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
    payment_type: p.productId ? 'product' : p.appointmentId ? 'service' : 'cash',
  };
}

function buildPaymentsWhere({
  dateFrom,
  dateTo,
  appointmentId,
  status,
  paymentMethodId,
  type,
  search,
}) {
  const where = {};

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (appointmentId) where.appointmentId = parseInt(appointmentId, 10);

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  if (paymentMethodId) {
    where.paymentMethodId = parseInt(paymentMethodId, 10);
  }

  if (type === 'service') {
    where.appointmentId = { not: null };
    where.productId = null;
  } else if (type === 'product') {
    where.productId = { not: null };
  } else if (type === 'cash') {
    where.appointmentId = null;
    where.productId = null;
  }

  const term = String(search || '').trim();
  if (term) {
    where.OR = [
      { reference: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
      { product: { name: { contains: term, mode: 'insensitive' } } },
      { product: { sku: { contains: term, mode: 'insensitive' } } },
      {
        appointment: {
          client: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      },
      { appointment: { service: { name: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

export const getPaymentMethods = async () => {
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, description: true },
  });
  const order = ['efectivo', 'transferencia', 'tarjeta'];
  return methods.sort(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name) || a.id - b.id,
  );
};

export const getAll = async ({
  dateFrom,
  dateTo,
  appointmentId,
  status,
  paymentMethodId,
  type,
  search,
  limit = 20,
  offset = 0,
}) => {
  const where = buildPaymentsWhere({
    dateFrom,
    dateTo,
    appointmentId,
    status,
    paymentMethodId,
    type,
    search,
  });

  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
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
      take,
      skip,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments: payments.map(toPaymentRow),
    total,
    limit: take,
    offset: skip,
  };
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
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('El monto debe ser mayor a 0.');
    err.statusCode = 400;
    throw err;
  }

  const appointmentId = normalizeOptionalAppointmentId(data.appointmentId);
  const productId = data.productId ? parseInt(data.productId, 10) : null;
  const paymentMethodId = data.paymentMethodId ? parseInt(data.paymentMethodId, 10) : null;
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
  if (!paymentMethodId || !Number.isFinite(paymentMethodId) || paymentMethodId < 1) {
    const err = new Error('Indica un método de pago válido.');
    err.statusCode = 400;
    throw err;
  }

  return runSerializable(prisma, async (tx) => {
    const paymentMethod = await tx.paymentMethod.findFirst({
      where: { id: paymentMethodId, isActive: true },
      select: { id: true },
    });
    if (!paymentMethod) {
      const err = new Error('El método de pago no existe o está inactivo.');
      err.statusCode = 400;
      throw err;
    }
    if (appointmentId) {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true },
      });
      if (!appointment) {
        const err = new Error('La cita indicada no existe.');
        err.statusCode = 404;
        throw err;
      }
      const existingForAppointment = await tx.payment.findFirst({
        where: { appointmentId, voidedAt: null },
        select: { id: true, reference: true },
      });
      if (existingForAppointment) {
        const err = new Error('Esta cita ya tiene un pago registrado.');
        err.statusCode = 409;
        err.reason = 'APPOINTMENT_ALREADY_PAID';
        throw err;
      }
    }

    const payment = await tx.payment.create({
      data: {
        appointmentId,
        productId: productId || null,
        productQuantity: productId ? productQuantity : null,
        amount,
        paymentMethodId,
        reference: await getOrCreateReference(tx, data.reference),
        notes: String(data.notes || '').trim() || null,
        createdBy: data.createdBy ? parseInt(data.createdBy, 10) : null,
      },
    });

    if (productId) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { isActive: true },
      });
      if (!product) {
        const err = new Error('Producto no encontrado.');
        err.statusCode = 404;
        throw err;
      }
      if (!product.isActive) {
        const err = new Error('No se puede vender un producto inactivo.');
        err.statusCode = 400;
        throw err;
      }
      await lockProducts(tx, [productId]);
      await changeStockAtomic(tx, {
        productId,
        quantityChange: -productQuantity,
        movementType: 'sale',
        sourceType: 'payment',
        paymentId: payment.id,
        notes: data.notes || `Venta registrada (${productQuantity} uds.)`,
        createdBy: data.createdBy ? parseInt(data.createdBy, 10) : null,
        insufficientMessage: 'Stock insuficiente para registrar esta venta.',
      });
    }

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
  const reason = assertVoidReason(voidReason);
  const pid = parseInt(id, 10);
  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${pid} FOR UPDATE`
    );
    const existing = await tx.payment.findUnique({ where: { id: pid } });
    if (!existing) {
      const err = new Error('Pago no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    if (existing.voidedAt) {
      return toPaymentRow(
        await tx.payment.findUnique({ where: { id: pid }, include: paymentIncludeForRow })
      );
    }

    const { productId } = existing;
    const pq = existing.productQuantity;
    if (productId && pq && pq > 0) {
      await lockProducts(tx, [productId]);
      const movement = await tx.inventoryMovement.findFirst({
        where: { paymentId: pid, movementType: 'sale' },
        orderBy: { id: 'asc' },
      });
      if (movement) {
        await reverseMovementAtomic(tx, movement, {
          voidReason: reason,
          voidedBy: voidedBy ? parseInt(voidedBy, 10) : null,
          notes: `Devolución por anulación de pago #${pid}`,
        });
      } else {
        // Compatibilidad para pagos previos a la migración, sin vínculo confiable.
        await changeStockAtomic(tx, {
          productId,
          quantityChange: pq,
          movementType: 'reversal',
          sourceType: 'reversal',
          paymentId: pid,
          notes: `Devolución legacy por anulación de pago #${pid}`,
          createdBy: voidedBy ? parseInt(voidedBy, 10) : null,
        });
      }
    }

    const claimed = await tx.payment.updateMany({
      where: { id: pid, voidedAt: null },
      data: {
        voidedAt: new Date(),
        voidReason: reason,
        voidedBy: voidedBy ? parseInt(voidedBy, 10) : null,
      },
    });
    if (claimed.count !== 1) {
      const err = new Error('El pago fue anulado por otra operación.');
      err.statusCode = 409;
      throw err;
    }

    const updated = await tx.payment.findUnique({
      where: { id: pid },
      include: paymentIncludeForRow,
    });
    return toPaymentRow(updated);
  });
};
