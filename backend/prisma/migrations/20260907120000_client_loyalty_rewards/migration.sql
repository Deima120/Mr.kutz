-- Fidelización: hitos otorgados automáticamente a un cliente (mascarilla gratis
-- cada 5 servicios completados, cerveza + depilación cada 10, repitiéndose
-- cíclicamente). Tabla nueva, no toca ninguna tabla existente ni afecta datos.
--
-- Esta migración no se pudo aplicar desde esta sesión: `prisma migrate dev` se
-- conecta a una base Neon real y el comando es interactivo (no soporta modo
-- no interactivo). Aplicar con `npx prisma migrate deploy` (o `db:migrate`)
-- cuando el propietario confirme el entorno.

CREATE TABLE "client_loyalty_rewards" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "milestone_key" VARCHAR(40) NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_at_count" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "payment_id" INTEGER,

    CONSTRAINT "client_loyalty_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_loyalty_rewards_client_id_milestone_key_occurrence_key"
  ON "client_loyalty_rewards" ("client_id", "milestone_key", "occurrence");

CREATE INDEX "client_loyalty_rewards_client_id_redeemed_at_idx"
  ON "client_loyalty_rewards" ("client_id", "redeemed_at");

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
