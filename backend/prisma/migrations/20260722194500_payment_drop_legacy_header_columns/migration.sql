-- Drop columnas legacy de cabecera Payment (post multi-línea).
-- Separada de Etapa 4 funcional: solo elimina appointment_id / product_id / product_quantity
-- y sus FKs. Los datos viven en payment_lines.

-- Precondición operativa: todo Payment debe tener al menos una payment_line.
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT COUNT(*)::int INTO orphan_count
  FROM "Payment" p
  WHERE NOT EXISTS (
    SELECT 1 FROM payment_lines pl WHERE pl.payment_id = p.id
  );
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Abortado: % pagos sin líneas. Corre payments:verify-lines y corrige antes de dropear columnas legacy.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_appointment_id_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_product_id_fkey";

ALTER TABLE "Payment" DROP COLUMN IF EXISTS "appointment_id";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "product_id";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "product_quantity";
