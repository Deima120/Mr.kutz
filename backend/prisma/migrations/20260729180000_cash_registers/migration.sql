-- Etapa 1 Caja: CashRegister + FK opcional en Payment (sin backfill de pagos históricos)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashRegisterStatus') THEN
    CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cash_registers" (
  "id" SERIAL NOT NULL,
  "business_date" DATE NOT NULL,
  "opening_amount" DECIMAL(10, 2) NOT NULL,
  "opened_by" INTEGER NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
  "closed_by" INTEGER,
  "closed_at" TIMESTAMP(3),
  "counted_cash" DECIMAL(10, 2),
  "notes" TEXT,
  CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cash_registers_business_date_key"
  ON "cash_registers"("business_date");

CREATE INDEX IF NOT EXISTS "cash_registers_status_idx"
  ON "cash_registers"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_opened_by_fkey'
  ) THEN
    ALTER TABLE "cash_registers"
      ADD CONSTRAINT "cash_registers_opened_by_fkey"
      FOREIGN KEY ("opened_by") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_closed_by_fkey'
  ) THEN
    ALTER TABLE "cash_registers"
      ADD CONSTRAINT "cash_registers_closed_by_fkey"
      FOREIGN KEY ("closed_by") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cash_register_id" INTEGER;

CREATE INDEX IF NOT EXISTS "Payment_cash_register_id_idx"
  ON "Payment"("cash_register_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_cash_register_id_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_cash_register_id_fkey"
      FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
