import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import {
  DOC_PREFIX,
  DOC_TYPES,
  allocateDocumentFolio,
  formatDocumentFolio,
  periodKeyFromYmd,
} from './documentSequence.js';

describe('formatDocumentFolio', () => {
  it('arma MKP/PO/GR con 6 dígitos', () => {
    assert.equal(formatDocumentFolio('MKP', '20260728', 1), 'MKP-20260728-000001');
    assert.equal(formatDocumentFolio('PO', '20260728', 42), 'PO-20260728-000042');
    assert.equal(formatDocumentFolio('GR', '20261201', 100000), 'GR-20261201-100000');
  });

  it('rechaza secuencias inválidas', () => {
    assert.throws(() => formatDocumentFolio('MKP', '20260728', 0));
    assert.throws(() => formatDocumentFolio('MKP', '2026-07-28', 1));
  });
});

describe('periodKeyFromYmd', () => {
  it('quita guiones', () => {
    assert.equal(periodKeyFromYmd('2026-07-28'), '20260728');
  });
});

/**
 * Simula upsert + UPDATE RETURNING con mutex async (como FOR UPDATE).
 */
function createSequenceTxHarness() {
  const rows = new Map();
  let chain = Promise.resolve();

  const withLock = (fn) => {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  return {
    documentSequence: {
      upsert: async ({ where, create }) => {
        const key = `${where.docType_periodKey.docType}|${where.docType_periodKey.periodKey}`;
        if (!rows.has(key)) {
          rows.set(key, {
            docType: create.docType,
            periodKey: create.periodKey,
            nextValue: create.nextValue ?? 1,
          });
        }
        return rows.get(key);
      },
    },
    $queryRaw: async (sql) =>
      withLock(async () => {
        const docType = sql.values[0];
        const periodKey = sql.values[1];
        const key = `${docType}|${periodKey}`;
        const row = rows.get(key);
        if (!row) return [];
        const allocated = row.nextValue;
        row.nextValue += 1;
        return [{ allocated }];
      }),
  };
}

describe('allocateDocumentFolio', () => {
  it('emite folios consecutivos del mismo día', async () => {
    const tx = createSequenceTxHarness();
    const fixed = new Date('2026-07-28T15:00:00-05:00');

    const a = await allocateDocumentFolio(tx, DOC_TYPES.payment, fixed);
    const b = await allocateDocumentFolio(tx, DOC_TYPES.payment, fixed);
    const c = await allocateDocumentFolio(tx, DOC_TYPES.purchase_order, fixed);

    assert.equal(a, 'MKP-20260728-000001');
    assert.equal(b, 'MKP-20260728-000002');
    assert.equal(c, 'PO-20260728-000001');
    assert.equal(DOC_PREFIX[DOC_TYPES.goods_receipt], 'GR');
  });

  it('bajo concurrencia no repite folios', async () => {
    const tx = createSequenceTxHarness();
    const fixed = new Date('2026-07-28T18:00:00-05:00');
    const N = 40;

    const folios = await Promise.all(
      Array.from({ length: N }, () => allocateDocumentFolio(tx, DOC_TYPES.payment, fixed))
    );

    assert.equal(folios.length, N);
    assert.equal(new Set(folios).size, N);
    const seqs = folios.map((f) => Number(f.split('-')[2]));
    assert.deepEqual(
      [...seqs].sort((x, y) => x - y),
      Array.from({ length: N }, (_, i) => i + 1)
    );
  });

  it('GR y PO tienen contadores independientes', async () => {
    const tx = createSequenceTxHarness();
    const fixed = new Date('2026-07-28T12:00:00-05:00');
    const gr = await allocateDocumentFolio(tx, DOC_TYPES.goods_receipt, fixed);
    const po = await allocateDocumentFolio(tx, DOC_TYPES.purchase_order, fixed);
    assert.equal(gr, 'GR-20260728-000001');
    assert.equal(po, 'PO-20260728-000001');
  });
});

describe('Prisma.sql binding smoke', () => {
  it('Prisma.sql expone values en orden', () => {
    const q = Prisma.sql`SELECT ${'payment'} , ${'20260728'}`;
    assert.equal(q.values[0], 'payment');
    assert.equal(q.values[1], '20260728');
  });
});
