/**
 * Folios internos secuenciales por día (America/Bogota).
 * Formato: {PREFIX}-{YYYYMMDD}-{######}
 * Prefijos: MKP (pagos), PO (órdenes), GR (recepciones).
 */

import { Prisma } from '@prisma/client';
import { getColombiaTodayYmd } from './colombiaTime.js';

export const DOC_TYPES = Object.freeze({
  payment: 'payment',
  purchase_order: 'purchase_order',
  goods_receipt: 'goods_receipt',
});

export const DOC_PREFIX = Object.freeze({
  [DOC_TYPES.payment]: 'MKP',
  [DOC_TYPES.purchase_order]: 'PO',
  [DOC_TYPES.goods_receipt]: 'GR',
});

export function periodKeyFromYmd(ymd) {
  return String(ymd || '').replaceAll('-', '');
}

/**
 * @param {string} prefix
 * @param {string} periodKey YYYYMMDD
 * @param {number} seq entero >= 1
 */
export function formatDocumentFolio(prefix, periodKey, seq) {
  const n = Number(seq);
  if (!prefix || !/^\d{8}$/.test(String(periodKey)) || !Number.isInteger(n) || n < 1) {
    throw new Error('Parámetros de folio no válidos.');
  }
  return `${prefix}-${periodKey}-${String(n).padStart(6, '0')}`;
}

/**
 * Reserva el siguiente consecutivo del día (Colombia) dentro de una transacción.
 * Requiere `tx.documentSequence` (Prisma) y `$queryRaw` para el UPDATE atómico.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {keyof typeof DOC_TYPES | string} docType
 * @param {Date} [now]
 * @returns {Promise<string>} folio completo
 */
export async function allocateDocumentFolio(tx, docType, now = new Date()) {
  const prefix = DOC_PREFIX[docType];
  if (!prefix) {
    const err = new Error(`Tipo de documento no soportado: ${docType}`);
    err.statusCode = 500;
    throw err;
  }

  const periodKey = periodKeyFromYmd(getColombiaTodayYmd(now));
  if (!/^\d{8}$/.test(periodKey)) {
    const err = new Error('No se pudo resolver la fecha de folio (Colombia).');
    err.statusCode = 500;
    throw err;
  }

  await tx.documentSequence.upsert({
    where: { docType_periodKey: { docType, periodKey } },
    create: { docType, periodKey, nextValue: 1 },
    update: {},
  });

  const rows = await tx.$queryRaw(
    Prisma.sql`
      UPDATE "document_sequences"
      SET "next_value" = "next_value" + 1, "updated_at" = NOW()
      WHERE "doc_type" = ${docType} AND "period_key" = ${periodKey}
      RETURNING ("next_value" - 1)::int AS allocated
    `
  );

  const allocated = Number(rows?.[0]?.allocated);
  if (!Number.isInteger(allocated) || allocated < 1) {
    const err = new Error('No se pudo reservar el consecutivo de folio.');
    err.statusCode = 503;
    throw err;
  }

  return formatDocumentFolio(prefix, periodKey, allocated);
}
