import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import { createWithTx, voidPaymentLineWithTx } from './payment.service.js';

/**
 * Workflow Etapa 3 — pago mixto vía createWithTx / voidPaymentLineWithTx (mock tx, sin BD).
 */

function money(n) {
  return new Prisma.Decimal(Number(n).toFixed(2));
}

const CATALOG = {
  1: { id: 1, name: 'efectivo', description: 'Efectivo', isCash: true, isActive: true },
  2: { id: 2, name: 'tarjeta', description: 'Tarjeta', isCash: false, isActive: true },
  3: { id: 3, name: 'transferencia', description: 'Transferencia', isCash: false, isActive: true },
};

function createMixedPaymentHarness({ appointmentId = 1, productId = 5, stock = 10 } = {}) {
  let paymentSeq = 1;
  let lineSeq = 1;
  let splitSeq = 1;
  let movementSeq = 1;
  let folioSeq = 1;
  const payments = new Map();
  const lines = new Map();
  const splits = new Map();
  const movements = new Map();
  const inventory = new Map([[productId, stock]]);

  function paymentMethodRow(id) {
    return CATALOG[id] ? { ...CATALOG[id] } : null;
  }

  function hydratePayment(row, include) {
    if (!row) return null;
    const paymentLines = [...lines.values()]
      .filter((l) => l.paymentId === row.id)
      .sort((a, b) => a.id - b.id)
      .map((l) => ({
        ...l,
        product:
          l.productId != null
            ? { name: 'Crema', sku: 'CR-1' }
            : undefined,
        appointment:
          l.appointmentId != null
            ? {
                appointmentDate: new Date('2026-07-01'),
                startTime: '10:00',
                clientId: 100,
                client: { firstName: 'Ana', lastName: 'López' },
                service: { name: 'Corte', price: money(25) },
              }
            : undefined,
      }));
    const methodSplits = [...splits.values()]
      .filter((s) => s.paymentId === row.id)
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        ...s,
        paymentMethod: paymentMethodRow(s.paymentMethodId),
      }));
    return {
      ...row,
      paymentMethod: paymentMethodRow(row.paymentMethodId),
      client: row.clientId
        ? { id: row.clientId, firstName: 'Ana', lastName: 'López' }
        : null,
      creator: null,
      voider: null,
      lines: include?.lines ? paymentLines : undefined,
      methodSplits: include?.methodSplits ? methodSplits : methodSplits,
    };
  }

  const tx = {
    paymentMethod: {
      findMany: async ({ where }) => {
        const ids = where?.id?.in || [];
        return ids
          .map((id) => paymentMethodRow(id))
          .filter((m) => m && (where.isActive == null || m.isActive === where.isActive));
      },
      findFirst: async ({ where }) => {
        const m = paymentMethodRow(where.id);
        if (!m) return null;
        if (where.isActive && !m.isActive) return null;
        return m;
      },
      findUnique: async ({ where }) => paymentMethodRow(where.id),
    },
    appointment: {
      findMany: async ({ where }) =>
        (where.id.in || []).map((id) => ({
          id,
          clientId: 100,
          status: 'completed',
          notes: null,
          serviceId: 1,
          service: { id: 1, name: 'Corte', price: money(25) },
          client: { id: 100, firstName: 'Ana', lastName: 'López' },
        })),
    },
    service: {
      findMany: async ({ where }) => {
        const ids = where?.id?.in || [];
        if (ids.length) {
          return ids.map((id) => ({
            id,
            name: id === 1 ? 'Corte' : `Servicio ${id}`,
            price: money(id === 1 ? 25 : 40),
            durationMinutes: 30,
          }));
        }
        return [];
      },
    },
    product: {
      findMany: async ({ where }) =>
        (where.id.in || []).map((id) => ({
          id,
          name: 'Crema',
          sku: 'CR-1',
          isActive: true,
          retailPrice: money(10),
        })),
      findUnique: async ({ where }) => ({ id: where.id, isActive: true }),
    },
    documentSequence: {
      upsert: async () => ({ nextValue: folioSeq }),
    },
    payment: {
      create: async ({ data }) => {
        const row = {
          id: paymentSeq++,
          voidedAt: null,
          voidReason: null,
          voidedBy: null,
          amountTendered: null,
          changeGiven: null,
          createdAt: new Date(),
          ...data,
        };
        payments.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include, select }) => {
        const row = payments.get(where.id);
        if (!row) return null;
        if (select) {
          const out = {};
          for (const key of Object.keys(select)) out[key] = row[key];
          return out;
        }
        return hydratePayment(row, include || { lines: true, methodSplits: true });
      },
      update: async ({ where, data }) => {
        const row = payments.get(where.id);
        Object.assign(row, data);
        return row;
      },
    },
    paymentMethodSplit: {
      create: async ({ data }) => {
        const row = { id: splitSeq++, createdAt: new Date(), ...data };
        splits.set(row.id, row);
        return row;
      },
      findMany: async ({ where, include }) => {
        let rows = [...splits.values()].filter((s) => s.paymentId === where.paymentId);
        if (include?.paymentMethod) {
          rows = rows.map((s) => ({
            ...s,
            paymentMethod: paymentMethodRow(s.paymentMethodId),
          }));
        }
        return rows;
      },
      update: async ({ where, data }) => {
        const row = splits.get(where.id);
        Object.assign(row, data);
        return row;
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
          return rows.map((l) => ({ appointmentId: l.appointmentId }));
        }
        if (where.paymentId != null) {
          rows = rows.filter((l) => l.paymentId === where.paymentId);
          if (where.voidedAt === null) rows = rows.filter((l) => !l.voidedAt);
          return rows.map((l) => ({
            lineAmount: l.lineAmount,
            voidedAt: l.voidedAt,
          }));
        }
        return rows;
      },
      findFirst: async ({ where }) =>
        [...lines.values()].find((l) => l.id === where.id && l.paymentId === where.paymentId) ||
        null,
      findUnique: async ({ where }) => {
        const row = lines.get(where.id);
        if (!row) return null;
        return {
          ...row,
          product: row.productId ? { name: 'Crema', sku: 'CR-1' } : undefined,
        };
      },
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
          (l) =>
            l.paymentId === where.paymentId &&
            (where.voidedAt === null ? !l.voidedAt : true)
        ).length,
    },
    inventory: {
      upsert: async ({ where, create }) => {
        if (!inventory.has(where.productId)) {
          inventory.set(where.productId, create.quantity ?? 0);
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
            return false;
          }) || null
        );
      },
      findUnique: async ({ where }) => {
        if (where.reversalOfMovementId) {
          return (
            [...movements.values()].find(
              (m) => m.reversalOfMovementId === where.reversalOfMovementId
            ) || null
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
    $queryRaw: async (query) => {
      const text = String(query?.strings?.join?.('') || query || '');
      if (text.includes('document_sequences') || text.includes('next_value')) {
        const allocated = folioSeq++;
        return [{ allocated }];
      }
      return [{ id: appointmentId }];
    },
    $executeRaw: async () => undefined,
  };

  return { tx, payments, lines, splits, inventory, appointmentId, productId };
}

describe('flujo pago mixto (create/void API)', () => {
  it('create mixto OK: 2 splits + vuelto solo sobre efectivo', async () => {
    const { tx, splits } = createMixedPaymentHarness();

    // Líneas: servicio 25 + producto 2×10 = 45
    const dto = await createWithTx(tx, {
      lines: [
        { type: 'service', appointmentId: 1 },
        { type: 'product', productId: 5, quantity: 2 },
      ],
      methodSplits: [
        { paymentMethodId: 1, amount: 20 },
        { paymentMethodId: 2, amount: 25 },
      ],
      amountTendered: 30,
      notes: 'mixto',
    });

    assert.equal(dto.amount, 45);
    assert.equal(dto.isMixedMethods, true);
    assert.equal(dto.methodSplits.length, 2);
    assert.equal(dto.amountTendered, 30);
    assert.equal(dto.changeGiven, 10); // 30 − 20 (cash), no 30 − 45
    assert.equal(dto.paymentMethodId, 1);
    assert.equal(splits.size, 2);
    assert.match(String(dto.paymentMethodName), /efectivo/);
    assert.match(String(dto.paymentMethodName), /tarjeta/);
  });

  it('create descuadrado: Σ splits ≠ amount → rechazado', async () => {
    const { tx } = createMixedPaymentHarness();

    await assert.rejects(
      () =>
        createWithTx(tx, {
          lines: [{ type: 'manual', unitPrice: 100, description: 'Caja' }],
          methodSplits: [
            { paymentMethodId: 1, amount: 40 },
            { paymentMethodId: 2, amount: 50 },
          ],
        }),
      /exactamente igual/
    );
  });

  it('void de línea bloqueado cuando el cobro es mixto', async () => {
    const { tx, lines } = createMixedPaymentHarness();

    const dto = await createWithTx(tx, {
      lines: [
        { type: 'manual', unitPrice: 40, description: 'A' },
        { type: 'manual', unitPrice: 60, description: 'B' },
      ],
      methodSplits: [
        { paymentMethodId: 1, amount: 40 },
        { paymentMethodId: 2, amount: 60 },
      ],
      amountTendered: 40,
    });

    const lineId = [...lines.values()].find((l) => l.paymentId === dto.id).id;

    await assert.rejects(
      () =>
        voidPaymentLineWithTx(tx, dto.id, lineId, {
          voidReason: 'cliente se arrepintió',
        }),
      (err) => {
        assert.match(err.message, /varios métodos de pago/);
        assert.equal(err.reason, 'MIXED_METHODS_VOID_LINE_FORBIDDEN');
        return true;
      }
    );

    assert.equal(
      [...lines.values()].filter((l) => l.paymentId === dto.id && !l.voidedAt).length,
      2
    );
  });

  it('compat: paymentMethodId suelto crea 1 split = total', async () => {
    const { tx, splits } = createMixedPaymentHarness();

    const dto = await createWithTx(tx, {
      paymentMethodId: 2,
      lines: [{ type: 'manual', unitPrice: 55, description: 'Propina' }],
    });

    assert.equal(dto.amount, 55);
    assert.equal(dto.isMixedMethods, false);
    assert.equal(dto.methodSplits.length, 1);
    assert.equal(dto.methodSplits[0].paymentMethodId, 2);
    assert.equal(dto.methodSplits[0].amount, 55);
    assert.equal(dto.amountTendered, null);
    assert.equal(dto.changeGiven, null);
    assert.equal(splits.size, 1);
  });

  it('void de línea OK con un solo método: recalcula amount y el split', async () => {
    const { tx, lines, splits } = createMixedPaymentHarness();

    const dto = await createWithTx(tx, {
      paymentMethodId: 1,
      amountTendered: 100,
      lines: [
        { type: 'manual', unitPrice: 40, description: 'A' },
        { type: 'manual', unitPrice: 60, description: 'B' },
      ],
    });

    assert.equal(dto.amount, 100);
    assert.equal(dto.changeGiven, 0);

    const lineB = [...lines.values()].find((l) => Number(l.lineAmount) === 60);

    const after = await voidPaymentLineWithTx(tx, dto.id, lineB.id, {
      voidReason: 'error de registro',
    });

    assert.equal(after.amount, 40);
    assert.equal(after.methodSplits.length, 1);
    assert.equal(after.methodSplits[0].amount, 40);
    assert.equal(after.amountTendered, 100);
    assert.equal(after.changeGiven, 60);
    assert.equal(Number([...splits.values()][0].amount), 40);
    assert.ok(lines.get(lineB.id).voidedAt);
  });
});
