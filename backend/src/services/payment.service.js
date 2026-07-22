/**
 * Payment Service — cobros multi-línea (cabecera + PaymentLine).
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
import { assertVoidReason } from './payment.rules.js';
import {
  assertSingleClientForServiceLines,
  derivePaymentType,
  httpPaymentError,
  moneyToNumber,
  normalizeCreateLineInputs,
  sumActiveLineAmounts,
  toMoneyDecimal,
  toPaymentLineDto,
} from './payment.lines.helpers.js';

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
  throw httpPaymentError('No se pudo generar una referencia de pago. Intenta de nuevo.', 503);
}

const lineInclude = {
  product: { select: { name: true, sku: true } },
  appointment: {
    select: {
      appointmentDate: true,
      startTime: true,
      clientId: true,
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true } },
    },
  },
};

const paymentDetailInclude = {
  paymentMethod: { select: { id: true, name: true, description: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
  creator: { select: { id: true, email: true } },
  voider: { select: { id: true, email: true } },
  lines: {
    include: lineInclude,
    orderBy: { id: 'asc' },
  },
};

function conceptFromLines(lines = []) {
  const active = lines.filter((l) => !l.voidedAt);
  if (active.length === 0) {
    const first = lines[0];
    return first?.description || first?.product?.name || first?.appointment?.service?.name || 'Cobro anulado';
  }
  if (active.length === 1) {
    const line = active[0];
    if (line.lineType === 'product') {
      const qty = line.quantity != null ? ` × ${line.quantity}` : '';
      return `${line.product?.name || line.description || 'Producto'}${qty}`;
    }
    if (line.lineType === 'service') return line.appointment?.service?.name || line.description || 'Servicio';
    return line.description || 'Cobro en caja';
  }
  return `${active.length} ítems`;
}

function clientNameFromPayment(p) {
  if (p.client) {
    return {
      client_first_name: p.client.firstName,
      client_last_name: p.client.lastName,
    };
  }
  const serviceLine = (p.lines || []).find((l) => l.lineType === 'service' && l.appointment?.client);
  if (serviceLine?.appointment?.client) {
    return {
      client_first_name: serviceLine.appointment.client.firstName,
      client_last_name: serviceLine.appointment.client.lastName,
    };
  }
  return {
    client_first_name: undefined,
    client_last_name: undefined,
  };
}

export function toPaymentDto(p) {
  const lines = p.lines || [];
  const paymentType = derivePaymentType(lines);
  const names = clientNameFromPayment(p);
  const serviceLine = lines.find((l) => l.lineType === 'service');
  const productLine = lines.find((l) => l.lineType === 'product');
  return {
    id: p.id,
    clientId: p.clientId ?? null,
    amount: moneyToNumber(p.amount),
    paymentMethodId: p.paymentMethodId,
    reference: p.reference,
    notes: p.notes,
    createdAt: p.createdAt,
    createdBy: p.createdBy ?? null,
    voidedAt: p.voidedAt,
    voidReason: p.voidReason,
    voidedBy: p.voidedBy ?? null,
    paymentMethodName: p.paymentMethod?.name,
    paymentType,
    concept: conceptFromLines(lines),
    lines: lines.map(toPaymentLineDto),
    appointment_id: serviceLine?.appointmentId ?? null,
    product_id: productLine?.productId ?? null,
    product_quantity: productLine?.quantity ?? null,
    payment_method_id: p.paymentMethodId,
    payment_method_name: p.paymentMethod?.name,
    created_at: p.createdAt,
    voided_at: p.voidedAt,
    void_reason: p.voidReason,
    voided_by: p.voidedBy,
    payment_type: paymentType,
    client_first_name: names.client_first_name,
    client_last_name: names.client_last_name,
    service_name: serviceLine?.appointment?.service?.name ?? null,
    product_name: productLine?.product?.name ?? null,
    product_sku: productLine?.product?.sku ?? null,
    appointment_date: serviceLine?.appointment?.appointmentDate ?? null,
    start_time: serviceLine?.appointment?.startTime ?? null,
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

  if (appointmentId) {
    const aid = parseInt(appointmentId, 10);
    where.lines = { some: { appointmentId: aid } };
  }

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  if (paymentMethodId) {
    where.paymentMethodId = parseInt(paymentMethodId, 10);
  }

  if (type === 'service') {
    where.AND = [
      ...(where.AND || []),
      { lines: { some: { lineType: 'service', voidedAt: null } } },
      { lines: { none: { lineType: { in: ['product', 'manual'] }, voidedAt: null } } },
    ];
  } else if (type === 'product') {
    where.AND = [
      ...(where.AND || []),
      { lines: { some: { lineType: 'product', voidedAt: null } } },
      { lines: { none: { lineType: { in: ['service', 'manual'] }, voidedAt: null } } },
    ];
  } else if (type === 'cash') {
    where.AND = [
      ...(where.AND || []),
      { lines: { some: { lineType: 'manual', voidedAt: null } } },
      { lines: { none: { lineType: { in: ['service', 'product'] }, voidedAt: null } } },
    ];
  } else if (type === 'mixed') {
    where.AND = [
      ...(where.AND || []),
      { lines: { some: { lineType: 'service', voidedAt: null } } },
      { lines: { some: { lineType: { in: ['product', 'manual'] }, voidedAt: null } } },
    ];
  }

  const term = String(search || '').trim();
  if (term) {
    const searchOr = [
      { reference: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
      { lines: { some: { description: { contains: term, mode: 'insensitive' } } } },
      { lines: { some: { product: { name: { contains: term, mode: 'insensitive' } } } } },
      { lines: { some: { product: { sku: { contains: term, mode: 'insensitive' } } } } },
      {
        lines: {
          some: {
            appointment: {
              client: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      },
      {
        lines: {
          some: {
            appointment: { service: { name: { contains: term, mode: 'insensitive' } } },
          },
        },
      },
    ];
    where.AND = [...(where.AND || []), { OR: searchOr }];
  }

  return where;
}

async function recalculatePaymentAmount(tx, paymentId) {
  const active = await tx.paymentLine.findMany({
    where: { paymentId, voidedAt: null },
    select: { lineAmount: true, voidedAt: true },
  });
  const total = sumActiveLineAmounts(active);
  await tx.payment.update({
    where: { id: paymentId },
    data: { amount: toMoneyDecimal(total) },
  });
  return total;
}

async function reverseProductLineStock(tx, line, { reason, voidedBy, paymentId }) {
  if (line.lineType !== 'product' || !line.productId) return;

  await lockProducts(tx, [line.productId]);
  const movement = await tx.inventoryMovement.findFirst({
    where: {
      OR: [
        { paymentLineId: line.id },
        { paymentId, paymentLineId: null, movementType: 'sale', productId: line.productId },
      ],
    },
    orderBy: { id: 'asc' },
  });

  if (movement) {
    await reverseMovementAtomic(tx, movement, {
      voidReason: reason,
      voidedBy,
      notes: `Devolución por anulación de línea #${line.id} (pago #${paymentId})`,
    });
    return;
  }

  await changeStockAtomic(tx, {
    productId: line.productId,
    quantityChange: line.quantity,
    movementType: 'reversal',
    sourceType: 'reversal',
    paymentId,
    paymentLineId: line.id,
    notes: `Devolución legacy por anulación de línea #${line.id}`,
    createdBy: voidedBy,
  });
}

async function voidOneLineInTx(tx, line, { reason, voidedBy, paymentId, now }) {
  if (line.voidedAt) return line;

  await reverseProductLineStock(tx, line, { reason, voidedBy, paymentId });

  const claimed = await tx.paymentLine.updateMany({
    where: { id: line.id, voidedAt: null },
    data: {
      voidedAt: now,
      voidReason: reason,
      voidedBy,
    },
  });
  if (claimed.count !== 1) {
    throw httpPaymentError('La línea fue anulada por otra operación.', 409);
  }
  return tx.paymentLine.findUnique({ where: { id: line.id }, include: lineInclude });
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
      include: paymentDetailInclude,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments: payments.map(toPaymentDto),
    total,
    limit: take,
    offset: skip,
  };
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const where = { voidedAt: null };
  if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(`${dateTo}T23:59:59.999Z`) };

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

async function loadPaymentDto(client, id) {
  const p = await client.payment.findUnique({
    where: { id: parseInt(id, 10) },
    include: paymentDetailInclude,
  });
  if (!p) return null;
  return toPaymentDto(p);
}

export const getById = async (id) => loadPaymentDto(prisma, id);

export const create = async (data) => {
  const paymentMethodId = data.paymentMethodId ? parseInt(data.paymentMethodId, 10) : null;
  if (!paymentMethodId || !Number.isFinite(paymentMethodId) || paymentMethodId < 1) {
    throw httpPaymentError('Indica un método de pago válido.');
  }

  const lineInputs = normalizeCreateLineInputs(data);
  const createdBy = data.createdBy ? parseInt(data.createdBy, 10) : null;

  try {
    return await runSerializable(prisma, async (tx) => {
      const paymentMethod = await tx.paymentMethod.findFirst({
        where: { id: paymentMethodId, isActive: true },
        select: { id: true },
      });
      if (!paymentMethod) {
        throw httpPaymentError('El método de pago no existe o está inactivo.');
      }

      const serviceInputs = lineInputs.filter((l) => l.type === 'service');
      const productInputs = lineInputs.filter((l) => l.type === 'product');
      const appointmentIds = [...new Set(serviceInputs.map((l) => l.appointmentId))];
      const productIds = [...new Set(productInputs.map((l) => l.productId))];

      const appointments = appointmentIds.length
        ? await tx.appointment.findMany({
            where: { id: { in: appointmentIds } },
            include: {
              service: { select: { id: true, name: true, price: true } },
              client: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : [];
      const appointmentsById = new Map(appointments.map((a) => [a.id, a]));

      for (const aid of appointmentIds) {
        if (!appointmentsById.has(aid)) {
          throw httpPaymentError(`La cita #${aid} no existe.`, 404);
        }
        const appt = appointmentsById.get(aid);
        if (appt.status !== 'completed') {
          throw httpPaymentError(`La cita #${aid} debe estar completada para cobrarla.`);
        }
      }

      const clientId = assertSingleClientForServiceLines(appointmentsById, serviceInputs);

      if (appointmentIds.length) {
        const already = await tx.paymentLine.findMany({
          where: {
            appointmentId: { in: appointmentIds },
            voidedAt: null,
          },
          select: { appointmentId: true },
        });
        if (already.length) {
          throw httpPaymentError('Esta cita ya tiene un cobro activo.', 409, 'APPOINTMENT_ALREADY_PAID');
        }
      }

      const products = productIds.length
        ? await tx.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, isActive: true, retailPrice: true },
          })
        : [];
      const productsById = new Map(products.map((p) => [p.id, p]));

      for (const pid of productIds) {
        const product = productsById.get(pid);
        if (!product) throw httpPaymentError(`Producto #${pid} no encontrado.`, 404);
        if (!product.isActive) throw httpPaymentError(`No se puede vender el producto inactivo #${pid}.`);
        if (product.retailPrice == null || moneyToNumber(product.retailPrice) <= 0) {
          throw httpPaymentError(`El producto #${pid} no tiene precio de venta válido.`);
        }
      }

      const resolvedLines = lineInputs.map((input) => {
        if (input.type === 'service') {
          const appt = appointmentsById.get(input.appointmentId);
          const unitPrice = toMoneyDecimal(appt.service.price);
          return {
            lineType: 'service',
            appointmentId: input.appointmentId,
            productId: null,
            quantity: 1,
            unitPrice,
            lineAmount: unitPrice,
            description: String(appt.service.name || 'Servicio').slice(0, 200),
          };
        }
        if (input.type === 'product') {
          const product = productsById.get(input.productId);
          const unitPrice = toMoneyDecimal(product.retailPrice);
          const lineAmount = toMoneyDecimal(moneyToNumber(unitPrice) * input.quantity);
          return {
            lineType: 'product',
            appointmentId: null,
            productId: input.productId,
            quantity: input.quantity,
            unitPrice,
            lineAmount,
            description: String(product.name || 'Producto').slice(0, 200),
          };
        }
        const unitPrice = toMoneyDecimal(input.unitPrice);
        return {
          lineType: 'manual',
          appointmentId: null,
          productId: null,
          quantity: 1,
          unitPrice,
          lineAmount: unitPrice,
          description: input.description,
        };
      });

      const headerAmount = toMoneyDecimal(sumActiveLineAmounts(resolvedLines));
      if (moneyToNumber(headerAmount) <= 0) {
        throw httpPaymentError('El total del cobro debe ser mayor a 0.');
      }

      const payment = await tx.payment.create({
        data: {
          clientId,
          amount: headerAmount,
          paymentMethodId,
          reference: await getOrCreateReference(tx, data.reference),
          notes: String(data.notes || '').trim() || null,
          createdBy: Number.isFinite(createdBy) ? createdBy : null,
        },
      });

      const createdLines = [];
      for (const line of resolvedLines) {
        try {
          const row = await tx.paymentLine.create({
            data: {
              paymentId: payment.id,
              lineType: line.lineType,
              appointmentId: line.appointmentId,
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineAmount: line.lineAmount,
              description: line.description,
            },
          });
          createdLines.push(row);
        } catch (err) {
          if (err?.code === 'P2002') {
            throw httpPaymentError('Esta cita ya tiene un cobro activo.', 409, 'APPOINTMENT_ALREADY_PAID');
          }
          throw err;
        }
      }

      if (productIds.length) {
        await lockProducts(tx, productIds);
      }

      for (let i = 0; i < createdLines.length; i += 1) {
        const line = createdLines[i];
        if (line.lineType !== 'product') continue;
        await changeStockAtomic(tx, {
          productId: line.productId,
          quantityChange: -line.quantity,
          movementType: 'sale',
          sourceType: 'payment',
          paymentId: payment.id,
          paymentLineId: line.id,
          notes: data.notes || `Venta línea #${line.id} (${line.quantity} uds.)`,
          createdBy: Number.isFinite(createdBy) ? createdBy : null,
          insufficientMessage: 'Stock insuficiente para registrar esta venta.',
        });
      }

      const full = await tx.payment.findUnique({
        where: { id: payment.id },
        include: paymentDetailInclude,
      });
      return toPaymentDto(full);
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      throw httpPaymentError('Esta cita ya tiene un cobro activo.', 409, 'APPOINTMENT_ALREADY_PAID');
    }
    throw err;
  }
};

/**
 * Anula el cobro completo (todas las líneas activas + cabecera).
 */
export const voidPayment = async (id, { voidReason, voidedBy } = {}) => {
  const reason = assertVoidReason(voidReason);
  const pid = parseInt(id, 10);
  const actor = voidedBy ? parseInt(voidedBy, 10) : null;
  const now = new Date();

  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${pid} FOR UPDATE`);
    const existing = await tx.payment.findUnique({
      where: { id: pid },
      include: { lines: true },
    });
    if (!existing) throw httpPaymentError('Pago no encontrado.', 404);
    if (existing.voidedAt) {
      return loadPaymentDto(tx, pid);
    }

    for (const line of existing.lines) {
      if (line.voidedAt) continue;
      await voidOneLineInTx(tx, line, {
        reason,
        voidedBy: Number.isFinite(actor) ? actor : null,
        paymentId: pid,
        now,
      });
    }

    await tx.payment.update({
      where: { id: pid },
      data: {
        amount: toMoneyDecimal(0),
        voidedAt: now,
        voidReason: reason,
        voidedBy: Number.isFinite(actor) ? actor : null,
      },
    });

    return loadPaymentDto(tx, pid);
  });
};

/**
 * Anula una línea; recalcula total; si no quedan activas, anula la cabecera.
 */
export const voidPaymentLine = async (paymentId, lineId, { voidReason, voidedBy } = {}) => {
  const reason = assertVoidReason(voidReason);
  const pid = parseInt(paymentId, 10);
  const lid = parseInt(lineId, 10);
  const actor = voidedBy ? parseInt(voidedBy, 10) : null;
  const now = new Date();

  return runSerializable(prisma, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${pid} FOR UPDATE`);
    const payment = await tx.payment.findUnique({ where: { id: pid } });
    if (!payment) throw httpPaymentError('Pago no encontrado.', 404);

    const line = await tx.paymentLine.findFirst({
      where: { id: lid, paymentId: pid },
    });
    if (!line) throw httpPaymentError('Línea de cobro no encontrada.', 404);

    if (line.voidedAt) {
      return loadPaymentDto(tx, pid);
    }

    await voidOneLineInTx(tx, line, {
      reason,
      voidedBy: Number.isFinite(actor) ? actor : null,
      paymentId: pid,
      now,
    });

    const remaining = await tx.paymentLine.count({
      where: { paymentId: pid, voidedAt: null },
    });

    if (remaining === 0) {
      await tx.payment.update({
        where: { id: pid },
        data: {
          amount: toMoneyDecimal(0),
          voidedAt: now,
          voidReason: reason,
          voidedBy: Number.isFinite(actor) ? actor : null,
        },
      });
    } else {
      await recalculatePaymentAmount(tx, pid);
      if (payment.voidedAt) {
        await tx.payment.update({
          where: { id: pid },
          data: { voidedAt: null, voidReason: null, voidedBy: null },
        });
      }
    }

    return loadPaymentDto(tx, pid);
  });
};
