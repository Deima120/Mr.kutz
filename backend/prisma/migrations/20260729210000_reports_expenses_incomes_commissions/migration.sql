-- Reportes Parte 2: gastos, otros ingresos, comisiones

ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "default_commission_percent" DECIMAL(5, 2) NOT NULL DEFAULT 40;

ALTER TABLE "Barber"
  ADD COLUMN IF NOT EXISTS "commission_percent" DECIMAL(5, 2);

CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" SERIAL NOT NULL,
  "category_id" INTEGER NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "expense_date" DATE NOT NULL,
  "notes" VARCHAR(500),
  "attachment_url" VARCHAR(500),
  "reference" VARCHAR(40),
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voided_at" TIMESTAMP(3),
  "void_reason" VARCHAR(500),
  "voided_by" INTEGER,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses"("expense_date");
CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id");
CREATE INDEX IF NOT EXISTS "expenses_voided_at_idx" ON "expenses"("voided_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_category_id_fkey') THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_created_by_fkey') THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_voided_by_fkey') THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "other_incomes" (
  "id" SERIAL NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "income_date" DATE NOT NULL,
  "description" VARCHAR(200) NOT NULL,
  "payment_method_id" INTEGER NOT NULL,
  "cash_register_id" INTEGER NOT NULL,
  "reference" VARCHAR(40),
  "notes" VARCHAR(500),
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voided_at" TIMESTAMP(3),
  "void_reason" VARCHAR(500),
  "voided_by" INTEGER,
  CONSTRAINT "other_incomes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "other_incomes_income_date_idx" ON "other_incomes"("income_date");
CREATE INDEX IF NOT EXISTS "other_incomes_cash_register_id_idx" ON "other_incomes"("cash_register_id");
CREATE INDEX IF NOT EXISTS "other_incomes_voided_at_idx" ON "other_incomes"("voided_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_incomes_payment_method_id_fkey') THEN
    ALTER TABLE "other_incomes"
      ADD CONSTRAINT "other_incomes_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_incomes_cash_register_id_fkey') THEN
    ALTER TABLE "other_incomes"
      ADD CONSTRAINT "other_incomes_cash_register_id_fkey"
      FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_incomes_created_by_fkey') THEN
    ALTER TABLE "other_incomes"
      ADD CONSTRAINT "other_incomes_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'other_incomes_voided_by_fkey') THEN
    ALTER TABLE "other_incomes"
      ADD CONSTRAINT "other_incomes_voided_by_fkey"
      FOREIGN KEY ("voided_by") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "commission_entries" (
  "id" SERIAL NOT NULL,
  "payment_id" INTEGER NOT NULL,
  "payment_line_id" INTEGER NOT NULL,
  "appointment_id" INTEGER NOT NULL,
  "barber_id" INTEGER NOT NULL,
  "service_amount" DECIMAL(10, 2) NOT NULL,
  "commission_percent" DECIMAL(5, 2) NOT NULL,
  "commission_amount" DECIMAL(10, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voided_at" TIMESTAMP(3),
  CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "commission_entries_payment_line_id_key" ON "commission_entries"("payment_line_id");
CREATE INDEX IF NOT EXISTS "commission_entries_created_at_idx" ON "commission_entries"("created_at");
CREATE INDEX IF NOT EXISTS "commission_entries_barber_id_idx" ON "commission_entries"("barber_id");
CREATE INDEX IF NOT EXISTS "commission_entries_payment_id_idx" ON "commission_entries"("payment_id");
CREATE INDEX IF NOT EXISTS "commission_entries_voided_at_idx" ON "commission_entries"("voided_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_entries_payment_id_fkey') THEN
    ALTER TABLE "commission_entries"
      ADD CONSTRAINT "commission_entries_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "Payment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_entries_payment_line_id_fkey') THEN
    ALTER TABLE "commission_entries"
      ADD CONSTRAINT "commission_entries_payment_line_id_fkey"
      FOREIGN KEY ("payment_line_id") REFERENCES "payment_lines"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_entries_appointment_id_fkey') THEN
    ALTER TABLE "commission_entries"
      ADD CONSTRAINT "commission_entries_appointment_id_fkey"
      FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_entries_barber_id_fkey') THEN
    ALTER TABLE "commission_entries"
      ADD CONSTRAINT "commission_entries_barber_id_fkey"
      FOREIGN KEY ("barber_id") REFERENCES "Barber"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "expense_categories" ("name", "is_active", "sort_order")
VALUES
  ('Arriendo', true, 1),
  ('Insumos', true, 2),
  ('Servicios públicos', true, 3),
  ('Nómina', true, 4),
  ('Otros', true, 5)
ON CONFLICT ("name") DO NOTHING;
