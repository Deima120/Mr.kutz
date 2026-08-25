/**
 * Detecta facturas repetidas para un mismo proveedor en `purchases`.
 *
 * Ejecutar ANTES de aplicar la migración
 * 20260825000000_purchase_invoice_unique_per_supplier: el índice único falla si
 * ya existen duplicados. Este script solo LEE, no modifica nada.
 *
 *     node scripts/find-duplicate-purchase-invoices.mjs
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

async function main() {
  const grouped = await prisma.purchase.groupBy({
    by: ['supplierId', 'invoiceNumber'],
    where: { invoiceNumber: { not: null } },
    _count: { _all: true },
    having: { invoiceNumber: { _count: { gt: 1 } } },
  });

  if (grouped.length === 0) {
    console.log('OK: no hay facturas repetidas por proveedor. La migración puede aplicarse.');
    return;
  }

  console.log(`ATENCIÓN: ${grouped.length} combinación(es) proveedor+factura repetidas.\n`);
  for (const row of grouped) {
    const purchases = await prisma.purchase.findMany({
      where: { supplierId: row.supplierId, invoiceNumber: row.invoiceNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        supplierName: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    console.log(
      `Proveedor #${row.supplierId} (${purchases[0]?.supplierName ?? '—'}) · factura ${row.invoiceNumber} · ${row._count._all} órdenes:`
    );
    for (const p of purchases) {
      console.log(
        `   - orden ${p.orderNumber} (id ${p.id}, estado ${p.status}, ${p.createdAt.toISOString().slice(0, 10)})`
      );
    }
    console.log('');
  }
  console.log(
    'Resuelve cada grupo (corregir el número o vaciarlo en las órdenes equivocadas) antes de migrar.'
  );
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('Error al revisar facturas duplicadas:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
