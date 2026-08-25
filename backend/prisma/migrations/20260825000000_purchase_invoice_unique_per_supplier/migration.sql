-- Una misma factura no puede repetirse con el mismo proveedor.
--
-- Postgres trata los NULL como distintos en un indice unico, asi que varias
-- ordenes SIN factura siguen siendo validas. Solo colisionan las que tienen el
-- mismo supplier_id y el mismo invoice_number no nulo.
--
-- OJO: esta migracion FALLA si ya existen duplicados en la base. Antes de
-- aplicarla en produccion, ejecutar:
--     node scripts/find-duplicate-purchase-invoices.mjs
-- y resolver lo que reporte.

CREATE UNIQUE INDEX IF NOT EXISTS "purchases_supplier_id_invoice_number_key"
  ON "purchases" ("supplier_id", "invoice_number");
