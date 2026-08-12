/**
 * Payment Service — cobros multi-línea (cabecera + PaymentLine).
 */

import prisma from '../lib/prisma.js';
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
import {
  assertCanVoidLine,
  buildIsCashLookup,
  computeTenderedAndChange,
  isMixedPaymentMethods,
  primaryPaymentMethodId,
  resolveMethodSplitsFromCreateBody,
} from './payment.methodSplits.helpers.js';
import {
  mapAppointmentServicesFields,
  resolveOrderedServicesForAppointment,
} from './appointment.service.js';
import { allocateDocumentFolio, DOC_TYPES } from '../utils/documentSequence.js';
import { applyColombiaCreatedAtFilter } from '../utils/colombiaTime.js';
// [DESACTIVADO-REPORTES-CAJA 2026-08-12] Módulo de Caja oculto de la vista del usuario.
// Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — reactivar descomentando este bloque.
// import { requireOpenCashRegister } from './cashRegister.service.js';
import {
  computeCommissionAmount,
  DEFAULT_COMMISSION_PERCENT,
  resolveCommissionPercent,
} from './commission.helpers.js';

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

const methodSplitInclude = {
  paymentMethod: { select: { id: true, name: true, description: true, isCash: true } },
};

const paymentDetailInclude = {
  paymentMethod: { select: { id: true, name: true, description: true, isCash: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
  creator: { select: { id: true, email: true } },
  voider: { select: { id: true, email: true } },
  lines: {
    include: lineInclude,
    orderBy: { id: 'asc' },
  },
  methodSplits: {
    include: methodSplitInclude,
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

function toMethodSplitDto(split) {
  return {
    id: split.id,
    paymentId: split.paymentId,
    paymentMethodId: split.paymentMethodId,
    amount: moneyToNumber(split.amount),
    paymentMethodName: split.paymentMethod?.name ?? null,
    isCash: Boolean(split.paymentMethod?.isCash),
  };
}

function methodDisplayName(p) {
  const splits = p.methodSplits || [];
  if (splits.length > 1) {
    return splits
      .map((s) => s.paymentMethod?.name)
      .filter(Boolean)
      .join(' + ') || 'Mixto';
  }
  if (splits.length === 1) {
    return splits[0].paymentMethod?.name || p.paymentMethod?.name;
  }
  return p.paymentMethod?.name;
}

export function toPaymentDto(p) {
  const lines = p.lines || [];
  const methodSplits = p.methodSplits || [];
  const paymentType = derivePaymentType(lines);
  const names = clientNameFromPayment(p);
  const serviceLine = lines.find((l) => l.lineType === 'service');
  const productLine = lines.find((l) => l.lineType === 'product');
  const methodName = methodDisplayName(p);
  const mixedMethods = isMixedPaymentMethods(methodSplits);
  return {
    id: p.id,
    clientId: p.clientId ?? null,
    cashRegisterId: p.cashRegisterId ?? null,
    amount: moneyToNumber(p.amount),
    paymentMethodId: p.paymentMethodId,
    reference: p.reference,
    notes: p.notes,
    amountTendered: p.amountTendered != null ? moneyToNumber(p.amountTendered) : null,
    changeGiven: p.changeGiven != null ? moneyToNumber(p.changeGiven) : null,
    createdAt: p.createdAt,
    createdBy: p.createdBy ?? null,
    voidedAt: p.voidedAt,
    voidReason: p.voidReason,
    voidedBy: p.voidedBy ?? null,
    paymentMethodName: methodName,
    paymentType,
    isMixedMethods: mixedMethods,
    methodSplits: methodSplits.map(toMethodSplitDto),
    concept: conceptFromLines(lines),
    lines: lines.map(toPaymentLineDto),
    appointment_id: serviceLine?.appointmentId ?? null,
    product_id: productLine?.productId ?? null,
    product_quantity: productLine?.quantity ?? null,
    payment_method_id: p.paymentMethodId,
    payment_method_name: methodName,
    cash_register_id: p.cashRegisterId ?? null,
    amount_tendered: p.amountTendered != null ? moneyToNumber(p.amountTendered) : null,
    change_given: p.changeGiven != null ? moneyToNumber(p.changeGiven) : null,
    is_mixed_methods: mixedMethods,
    method_splits: methodSplits.map(toMethodSplitDto),
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
    applyColombiaCreatedAtFilter(where, dateFrom, dateTo);
  }

  if (appointmentId) {
    const aid = parseInt(appointmentId, 10);
    where.lines = { some: { appointmentId: aid } };
  }

  if (status === 'active') where.voidedAt = null;
  if (status === 'voided') where.voidedAt = { not: null };

  if (paymentMethodId) {
    const mid = parseInt(paymentMethodId, 10);
    where.methodSplits = { some: { paymentMethodId: mid } };
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

/**
 * Tras void de línea con un solo método: alinea el split (y vuelto) al nuevo total.
 */
async function syncSingleMethodSplitToAmount(tx, paymentId, newAmount) {
  const splits = await tx.paymentMethodSplit.findMany({
    where: { paymentId },
    include: { paymentMethod: { select: { id: true, isCash: true } } },
  });
  if (splits.length !== 1) return;

  const split = splits[0];
  const amountDec = toMoneyDecimal(newAmount);
  await tx.paymentMethodSplit.update({
    where: { id: split.id },
    data: { amount: amountDec },
  });

  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { amountTendered: true },
  });
  const isCashByMethodId = buildIsCashLookup([
    { id: split.paymentMethodId, isCash: split.paymentMethod?.isCash },
  ]);
  const cashCents = Math.round(moneyToNumber(newAmount) * 100);
  const hasCash = Boolean(split.paymentMethod?.isCash) && cashCents > 0;

  if (!hasCash) {
    await tx.payment.update({
      where: { id: paymentId },
      data: { amountTendered: null, changeGiven: null },
    });
    return;
  }

  const tenderedInput =
    payment?.amountTendered != null &&
    Math.round(moneyToNumber(payment.amountTendered) * 100) >= cashCents
      ? payment.amountTendered
      : undefined;

  const tendered = computeTenderedAndChange({
    splits: [{ paymentMethodId: split.paymentMethodId, amount: moneyToNumber(newAmount) }],
    isCashByMethodId,
    amountTendered: tenderedInput,
  });

  await tx.payment.update({
    where: { id: paymentId },
    data: {
      amountTendered: tendered.amountTendered,
      changeGiven: tendered.changeGiven,
    },
  });
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

  await tx.commissionEntry.updateMany({
    where: { paymentLineId: line.id, voidedAt: null },
    data: { voidedAt: now },
  });

  return tx.paymentLine.findUnique({ where: { id: line.id }, include: lineInclude });
}

export const getPaymentMethods = async () => {
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, description: true, isCash: true },
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
  applyColombiaCreatedAtFilter(where, dateFrom, dateTo);

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

/**
 * Crea cobro multi-línea + method splits dentro de una tx (testeable).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function createWithTx(tx, data) {
  const lineInputs = normalizeCreateLineInputs(data);
  const createdBy = data.createdBy ? parseInt(data.createdBy, 10) : null;
  // [DESACTIVADO-REPORTES-CAJA 2026-08-12] Sin UI de Caja el usuario no puede abrirla, así que
  // exigir caja abierta dejaría los cobros bloqueados sin salida. Se levanta el requisito.
  // Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md — al reimplementar Caja hay que
  // restaurar esta línea Y volver a asociar el pago a openRegister.id más abajo.
  // const openRegister = await requireOpenCashRegister(tx);

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
          barber: { select: { id: true, commissionPercent: true } },
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

  const resolvedLines = [];
  for (const input of lineInputs) {
    if (input.type === 'service') {
      const appt = appointmentsById.get(input.appointmentId);
      const ordered = await resolveOrderedServicesForAppointment(appt, tx);
      const svc = mapAppointmentServicesFields(ordered, appt.service);
      const unitPrice = toMoneyDecimal(svc.price);
      if (moneyToNumber(unitPrice) <= 0) {
        throw httpPaymentError(
          `La cita #${input.appointmentId} no tiene un precio de servicio válido.`
        );
      }
      resolvedLines.push({
        lineType: 'service',
        appointmentId: input.appointmentId,
        productId: null,
        quantity: 1,
        unitPrice,
        lineAmount: unitPrice,
        description: String(svc.service_name || appt.service?.name || 'Servicio').slice(0, 200),
      });
      continue;
    }
    if (input.type === 'product') {
      const product = productsById.get(input.productId);
      const unitPrice = toMoneyDecimal(product.retailPrice);
      const lineAmount = toMoneyDecimal(moneyToNumber(unitPrice) * input.quantity);
      resolvedLines.push({
        lineType: 'product',
        appointmentId: null,
        productId: input.productId,
        quantity: input.quantity,
        unitPrice,
        lineAmount,
        description: String(product.name || 'Producto').slice(0, 200),
      });
      continue;
    }
    const unitPrice = toMoneyDecimal(input.unitPrice);
    resolvedLines.push({
      lineType: 'manual',
      appointmentId: null,
      productId: null,
      quantity: 1,
      unitPrice,
      lineAmount: unitPrice,
      description: input.description,
    });
  }

  const headerAmountNum = sumActiveLineAmounts(resolvedLines);
  const headerAmount = toMoneyDecimal(headerAmountNum);
  if (headerAmountNum <= 0) {
    throw httpPaymentError('El total del cobro debe ser mayor a 0.');
  }

  const methodSplits = resolveMethodSplitsFromCreateBody(data, headerAmountNum);
  const methodIds = [...new Set(methodSplits.map((s) => s.paymentMethodId))];
  const methods = await tx.paymentMethod.findMany({
    where: { id: { in: methodIds }, isActive: true },
    select: { id: true, name: true, description: true, isCash: true },
  });
  if (methods.length !== methodIds.length) {
    throw httpPaymentError('Uno o más métodos de pago no existen o están inactivos.');
  }
  const isCashByMethodId = buildIsCashLookup(methods);
  const tendered = computeTenderedAndChange({
    splits: methodSplits,
    isCashByMethodId,
    amountTendered: data.amountTendered,
  });
  const headerMethodId = primaryPaymentMethodId(methodSplits);

  const payment = await tx.payment.create({
    data: {
      clientId,
      amount: headerAmount,
      paymentMethodId: headerMethodId,
      // [DESACTIVADO-REPORTES-CAJA 2026-08-12] Payment.cashRegisterId es Int? (nullable), así que
      // no hace falta migración. Ver ADR: private/adr/0001-desactivacion-reportes-y-caja.md
      // cashRegisterId: openRegister.id,
      cashRegisterId: null,
      reference: await allocateDocumentFolio(tx, DOC_TYPES.payment),
      notes: String(data.notes || '').trim() || null,
      amountTendered: tendered.amountTendered,
      changeGiven: tendered.changeGiven,
      createdBy: Number.isFinite(createdBy) ? createdBy : null,
    },
  });

  for (const split of methodSplits) {
    await tx.paymentMethodSplit.create({
      data: {
        paymentId: payment.id,
        paymentMethodId: split.paymentMethodId,
        amount: toMoneyDecimal(split.amount),
      },
    });
  }

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

  const serviceCreated = createdLines.filter(
    (line) => line.lineType === 'service' && line.appointmentId
  );
  if (serviceCreated.length) {
    const setting = await tx.businessSetting.findFirst({
      orderBy: { id: 'asc' },
      select: { defaultCommissionPercent: true },
    });
    const defaultPercent =
      setting?.defaultCommissionPercent ?? DEFAULT_COMMISSION_PERCENT;

    for (const line of serviceCreated) {
      const appt = appointmentsById.get(line.appointmentId);
      if (!appt?.barberId) {
        throw httpPaymentError(
          `La cita #${line.appointmentId} no tiene barbero asignado para comisión.`
        );
      }
      const percent = resolveCommissionPercent(
        appt.barber?.commissionPercent,
        defaultPercent
      );
      const serviceAmount = moneyToNumber(line.lineAmount);
      const commissionAmount = computeCommissionAmount(serviceAmount, percent);
      await tx.commissionEntry.create({
        data: {
          paymentId: payment.id,
          paymentLineId: line.id,
          appointmentId: line.appointmentId,
          barberId: appt.barberId,
          serviceAmount: toMoneyDecimal(serviceAmount),
          commissionPercent: toMoneyDecimal(percent),
          commissionAmount: toMoneyDecimal(commissionAmount),
        },
      });
    }
  }

  const full = await tx.payment.findUnique({
    where: { id: payment.id },
    include: paymentDetailInclude,
  });
  return toPaymentDto(full);
}

export const create = async (data) => {
  try {
    return await runSerializable(prisma, async (tx) => createWithTx(tx, data));
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
 * Con >1 método de pago → rechazado (opción B).
 */
export async function voidPaymentLineWithTx(tx, paymentId, lineId, { voidReason, voidedBy } = {}) {
  const reason = assertVoidReason(voidReason);
  const pid = parseInt(paymentId, 10);
  const lid = parseInt(lineId, 10);
  const actor = voidedBy ? parseInt(voidedBy, 10) : null;
  const now = new Date();

  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${pid} FOR UPDATE`);
  const payment = await tx.payment.findUnique({ where: { id: pid } });
  if (!payment) throw httpPaymentError('Pago no encontrado.', 404);

  const methodSplits = await tx.paymentMethodSplit.findMany({
    where: { paymentId: pid },
  });
  assertCanVoidLine(methodSplits);

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
        amountTendered: null,
        changeGiven: null,
        voidedAt: now,
        voidReason: reason,
        voidedBy: Number.isFinite(actor) ? actor : null,
      },
    });
    await syncSingleMethodSplitToAmount(tx, pid, 0);
  } else {
    const newAmount = await recalculatePaymentAmount(tx, pid);
    await syncSingleMethodSplitToAmount(tx, pid, newAmount);
    if (payment.voidedAt) {
      await tx.payment.update({
        where: { id: pid },
        data: { voidedAt: null, voidReason: null, voidedBy: null },
      });
    }
  }

  return loadPaymentDto(tx, pid);
}

export const voidPaymentLine = async (paymentId, lineId, opts = {}) => {
  return runSerializable(prisma, async (tx) =>
    voidPaymentLineWithTx(tx, paymentId, lineId, opts)
  );
};
