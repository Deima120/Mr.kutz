import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import {
  changeStockAtomic,
  reverseMovementAtomic,
  runSerializable,
} from './inventory.helpers.js';

/**
 * Flujo de negocio Etapa 2: multi-línea + void parcial + unique de cita.
 * Usa mocks de tx (sin BD) alineados con payment.service.
 */

function money(n) {
  return new Prisma.Decimal(Number(n).toFixed(2));
}

function createPaymentWorkflowHarness() {
  let paymentSeq = 1;
  let lineSeq = 1;
  let movementSeq = 1;
  const payments = new Map();
  const lines = new Map();
  const movements = new Map();
  const inventory = new Map([[5, 10]]);

  const tx = {
    paymentMethod: {
      findFirst: async ({ where }) => (where.id === 1 ? { id: 1 } : null),
    },
    appointment: {
      findMany: async ({ where }) => {
        const ids = where.id.in;
        return ids.map((id) => ({
          id,
          clientId: 100,
          status: 'completed',
          service: { id: 1, name: 'Corte', price: money(25) },
          client: { id: 100, firstName: 'Ana', lastName: 'López' },
        }));
      },
    },
    product: {
      findMany: async ({ where }) =>
        where.id.in.map((id) => ({
          id,
          name: 'Crema',
          sku: 'CR-1',
          isActive: true,
          retailPrice: money(10),
        })),
    },
    payment: {
      findFirst: async () => null,
      create: async ({ data }) => {
        const row = { id: paymentSeq++, ...data, voidedAt: null, lines: [] };
        payments.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }) => {
        const row = payments.get(where.id);
        if (!row) return null;
        const paymentLines = [...lines.values()].filter((l) => l.paymentId === row.id);
        if (include?.lines) {
          return { ...row, lines: paymentLines, paymentMethod: { name: 'efectivo' } };
        }
        return { ...row, lines: paymentLines };
      },
      update: async ({ where, data }) => {
        const row = payments.get(where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const row = payments.get(where.id);
        if (!row || (where.voidedAt === null && row.voidedAt)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    paymentLine: {
      findMany: async ({ where }) => {
        let rows = [...lines.values()];
        if (where.appointmentId?.in) {
          rows = rows.filter(
            (l) =>
              where.appointmentId.in.includes(l.appointmentId) &&
              (where.voidedAt === null ? !l.voidedAt : true)
          );
        }
        if (where.paymentId && where.voidedAt === null) {
          rows = rows.filter((l) => l.paymentId === where.paymentId && !l.voidedAt);
        }
        return rows.map((l) => ({ lineAmount: l.lineAmount, voidedAt: l.voidedAt }));
      },
      findFirst: async ({ where }) => {
        return (
          [...lines.values()].find(
            (l) => l.id === where.id && l.paymentId === where.paymentId
          ) || null
        );
      },
      findUnique: async ({ where }) => lines.get(where.id) || null,
      create: async ({ data }) => {
        if (data.appointmentId && data.voidedAt == null) {
          const dup = [...lines.values()].find(
            (l) => l.appointmentId === data.appointmentId && !l.voidedAt
          );
          if (dup) {
            const err = new Error('Unique');
            err.code = 'P2002';
            throw err;
          }
        }
        const row = { id: lineSeq++, voidedAt: null, ...data };
        lines.set(row.id, row);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const row = lines.get(where.id);
        if (!row || row.voidedAt) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
      count: async ({ where }) =>
        [...lines.values()].filter(
          (l) => l.paymentId === where.paymentId && (where.voidedAt === null ? !l.voidedAt : true)
        ).length,
      aggregate: async ({ where }) => {
        const active = [...lines.values()].filter(
          (l) => l.paymentId === where.paymentId && !l.voidedAt
        );
        const sum = active.reduce((a, l) => a + Number(l.lineAmount), 0);
        return { _sum: { lineAmount: money(sum) } };
      },
    },
    inventory: {
      upsert: async ({ where, create, update }) => {
        const qty = inventory.get(where.productId);
        if (qty == null) {
          inventory.set(where.productId, create.quantity ?? 0);
          return { productId: where.productId, quantity: inventory.get(where.productId) };
        }
        if (update?.quantity?.increment) {
          inventory.set(where.productId, qty + update.quantity.increment);
        }
        return { productId: where.productId, quantity: inventory.get(where.productId) };
      },
      updateMany: async ({ where, data }) => {
        const qty = inventory.get(where.productId) ?? 0;
        if (data.quantity?.decrement) {
          if (qty < data.quantity.decrement) return { count: 0 };
          inventory.set(where.productId, qty - data.quantity.decrement);
          return { count: 1 };
        }
        if (data.quantity?.increment) {
          inventory.set(where.productId, qty + data.quantity.increment);
          return { count: 1 };
        }
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        const qty = inventory.get(where.productId) ?? 0;
        if (data.quantity?.increment) {
          inventory.set(where.productId, qty + data.quantity.increment);
        }
        return { productId: where.productId, quantity: inventory.get(where.productId) };
      },
      findUnique: async ({ where }) =>
        inventory.has(where.productId)
          ? { productId: where.productId, quantity: inventory.get(where.productId) }
          : null,
      create: async ({ data }) => {
        inventory.set(data.productId, data.quantity ?? 0);
        return data;
      },
    },
    inventoryMovement: {
      create: async ({ data }) => {
        const row = { id: movementSeq++, voidedAt: null, ...data };
        movements.set(row.id, row);
        return row;
      },
      findFirst: async ({ where }) => {
        return (
          [...movements.values()].find((m) => {
            if (where.paymentLineId != null) return m.paymentLineId === where.paymentLineId;
            if (where.OR) {
              return where.OR.some((clause) => {
                if (clause.paymentLineId != null) return m.paymentLineId === clause.paymentLineId;
                return (
                  m.paymentId === clause.paymentId &&
                  m.movementType === clause.movementType &&
                  m.productId === clause.productId
                );
              });
            }
            return m.paymentId === where.paymentId && m.movementType === where.movementType;
          }) || null
        );
      },
      findUnique: async ({ where }) => {
        if (where.reversalOfMovementId) {
          return (
            [...movements.values()].find((m) => m.reversalOfMovementId === where.reversalOfMovementId) ||
            null
          );
        }
        return movements.get(where.id) || null;
      },
      updateMany: async ({ where, data }) => {
        const row = movements.get(where.id);
        if (!row || row.voidedAt) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    product: {
      findMany: async ({ where }) =>
        where.id.in.map((id) => ({
          id,
          name: 'Crema',
          sku: 'CR-1',
          isActive: true,
          retailPrice: money(10),
        })),
      findUnique: async ({ where }) => ({ id: where.id, isActive: true }),
    },
    $queryRaw: async () => [{ id: 1 }],
    $executeRaw: async () => undefined,
  };

  // Alias product on tx already used — merge findMany from earlier product
  const productFindMany = tx.product.findMany;
  tx.product = {
    findMany: productFindMany,
    findUnique: async ({ where }) => ({ id: where.id, isActive: true }),
  };

  return { tx, payments, lines, movements, inventory };
}

describe('flujo cobro multi-línea (mock)', () => {
  it('crea service+product, anula solo producto y recalcula total', async () => {
    const { tx, inventory, lines, payments } = createPaymentWorkflowHarness();

    const payment = await tx.payment.create({
      data: {
        amount: money(45),
        paymentMethodId: 1,
        clientId: 100,
        reference: 'T-1',
      },
    });
    const serviceLine = await tx.paymentLine.create({
      data: {
        paymentId: payment.id,
        lineType: 'service',
        appointmentId: 1,
        quantity: 1,
        unitPrice: money(25),
        lineAmount: money(25),
        description: 'Corte',
      },
    });
    const productLine = await tx.paymentLine.create({
      data: {
        paymentId: payment.id,
        lineType: 'product',
        productId: 5,
        quantity: 2,
        unitPrice: money(10),
        lineAmount: money(20),
        description: 'Crema',
      },
    });

    await changeStockAtomic(tx, {
      productId: 5,
      quantityChange: -2,
      movementType: 'sale',
      sourceType: 'payment',
      paymentId: payment.id,
      paymentLineId: productLine.id,
    });
    assert.equal(inventory.get(5), 8);

    const sale = await tx.inventoryMovement.findFirst({
      where: { paymentLineId: productLine.id },
    });
    await reverseMovementAtomic(tx, sale, { voidReason: 'devuelve crema' });
    await tx.paymentLine.updateMany({
      where: { id: productLine.id, voidedAt: null },
      data: { voidedAt: new Date(), voidReason: 'devuelve crema' },
    });

    const active = [...lines.values()].filter((l) => l.paymentId === payment.id && !l.voidedAt);
    const sum = active.reduce((a, l) => a + Number(l.lineAmount), 0);
    await tx.payment.update({ where: { id: payment.id }, data: { amount: money(sum) } });

    assert.equal(Number(payments.get(payment.id).amount), 25);
    assert.ok(lines.get(productLine.id).voidedAt);
    assert.equal(lines.get(serviceLine.id).voidedAt, null);
    assert.equal(inventory.get(5), 10);
  });

  it('al anular todas las líneas la cabecera queda en 0', async () => {
    const { tx, lines, payments } = createPaymentWorkflowHarness();
    const payment = await tx.payment.create({
      data: { amount: money(25), paymentMethodId: 1, reference: 'T-2' },
    });
    const line = await tx.paymentLine.create({
      data: {
        paymentId: payment.id,
        lineType: 'service',
        appointmentId: 9,
        quantity: 1,
        unitPrice: money(25),
        lineAmount: money(25),
        description: 'Corte',
      },
    });
    await tx.paymentLine.updateMany({
      where: { id: line.id, voidedAt: null },
      data: { voidedAt: new Date(), voidReason: 'error' },
    });
    const remaining = await tx.paymentLine.count({
      where: { paymentId: payment.id, voidedAt: null },
    });
    assert.equal(remaining, 0);
    await tx.payment.update({
      where: { id: payment.id },
      data: { amount: money(0), voidedAt: new Date(), voidReason: 'error' },
    });
    assert.equal(Number(payments.get(payment.id).amount), 0);
    assert.ok(payments.get(payment.id).voidedAt);
    assert.equal([...lines.values()].filter((l) => !l.voidedAt).length, 0);
  });

  it('rechaza segunda línea activa para la misma cita (unique)', async () => {
    const { tx } = createPaymentWorkflowHarness();
    const p1 = await tx.payment.create({
      data: { amount: money(25), paymentMethodId: 1, reference: 'A' },
    });
    await tx.paymentLine.create({
      data: {
        paymentId: p1.id,
        lineType: 'service',
        appointmentId: 42,
        quantity: 1,
        unitPrice: money(25),
        lineAmount: money(25),
        description: 'Corte',
      },
    });
    const p2 = await tx.payment.create({
      data: { amount: money(25), paymentMethodId: 1, reference: 'B' },
    });
    await assert.rejects(
      () =>
        tx.paymentLine.create({
          data: {
            paymentId: p2.id,
            lineType: 'service',
            appointmentId: 42,
            quantity: 1,
            unitPrice: money(25),
            lineAmount: money(25),
            description: 'Corte dup',
          },
        }),
      (err) => err.code === 'P2002'
    );
  });

  it('runSerializable reintenta conflictos', async () => {
    let attempts = 0;
    const client = {
      $transaction: async (op) => {
        attempts += 1;
        if (attempts < 2) {
          const error = new Error('conflict');
          error.code = 'P2034';
          throw error;
        }
        return op({});
      },
    };
    const result = await runSerializable(client, async () => 'ok');
    assert.equal(result, 'ok');
    assert.equal(attempts, 2);
  });
});
