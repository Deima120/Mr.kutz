-- Normalizar métodos de pago: efectivo, transferencia, tarjeta

UPDATE "payment_methods"
SET "name" = 'efectivo', "description" = 'Efectivo', "is_active" = true
WHERE "name" = 'cash';

UPDATE "payment_methods"
SET "name" = 'transferencia', "description" = 'Transferencia', "is_active" = true
WHERE "name" = 'transfer';

UPDATE "payment_methods"
SET "name" = 'tarjeta', "description" = 'Tarjeta', "is_active" = true
WHERE "name" = 'card';

INSERT INTO "payment_methods" ("name", "description", "is_active")
SELECT 'efectivo', 'Efectivo', true
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "name" = 'efectivo');

INSERT INTO "payment_methods" ("name", "description", "is_active")
SELECT 'transferencia', 'Transferencia', true
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "name" = 'transferencia');

INSERT INTO "payment_methods" ("name", "description", "is_active")
SELECT 'tarjeta', 'Tarjeta', true
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "name" = 'tarjeta');

UPDATE "payment_methods"
SET "is_active" = false
WHERE "name" NOT IN ('efectivo', 'transferencia', 'tarjeta');
