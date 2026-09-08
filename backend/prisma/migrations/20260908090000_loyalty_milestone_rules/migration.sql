-- Rediseño completo de fidelización: reemplaza los hitos hardcodeados en código
-- (migración 20260907120000_client_loyalty_rewards, tabla creada AYER y aún
-- vacía en producción — confirmado con COUNT() = 0 antes de escribir esto) por
-- reglas configurables desde el panel de administración, con premios ligados a
-- servicios/productos reales del catálogo.
--
-- Se elimina y se vuelve a crear "client_loyalty_rewards" en vez de alterarla
-- porque no hay ninguna fila real que preservar y el cambio de forma
-- (milestone_key de texto -> rule_id relacional) no es un simple rename.

DROP TABLE IF EXISTS "client_loyalty_rewards" CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoyaltyRewardItemType') THEN
    CREATE TYPE "LoyaltyRewardItemType" AS ENUM ('service', 'product');
  END IF;
END $$;

CREATE TABLE "loyalty_milestone_rules" (
    "id" SERIAL NOT NULL,
    "every_count" INTEGER NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_milestone_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loyalty_milestone_rules_every_count_key"
  ON "loyalty_milestone_rules" ("every_count");

CREATE TABLE "loyalty_milestone_reward_items" (
    "id" SERIAL NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "item_type" "LoyaltyRewardItemType" NOT NULL,
    "service_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "loyalty_milestone_reward_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_milestone_reward_items_rule_id_idx"
  ON "loyalty_milestone_reward_items" ("rule_id");

ALTER TABLE "loyalty_milestone_reward_items"
  ADD CONSTRAINT "loyalty_milestone_reward_items_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "loyalty_milestone_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_milestone_reward_items"
  ADD CONSTRAINT "loyalty_milestone_reward_items_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loyalty_milestone_reward_items"
  ADD CONSTRAINT "loyalty_milestone_reward_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "client_loyalty_rewards" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_at_count" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMP(3),
    "payment_id" INTEGER,

    CONSTRAINT "client_loyalty_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_loyalty_rewards_client_id_rule_id_occurrence_key"
  ON "client_loyalty_rewards" ("client_id", "rule_id", "occurrence");

CREATE INDEX "client_loyalty_rewards_client_id_redeemed_at_idx"
  ON "client_loyalty_rewards" ("client_id", "redeemed_at");

CREATE INDEX "client_loyalty_rewards_granted_at_idx"
  ON "client_loyalty_rewards" ("granted_at");

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "loyalty_milestone_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "client_loyalty_reward_items" (
    "id" SERIAL NOT NULL,
    "reward_id" INTEGER NOT NULL,
    "item_type" "LoyaltyRewardItemType" NOT NULL,
    "service_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description" VARCHAR(200) NOT NULL,

    CONSTRAINT "client_loyalty_reward_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_loyalty_reward_items_reward_id_idx"
  ON "client_loyalty_reward_items" ("reward_id");

ALTER TABLE "client_loyalty_reward_items"
  ADD CONSTRAINT "client_loyalty_reward_items_reward_id_fkey"
  FOREIGN KEY ("reward_id") REFERENCES "client_loyalty_rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
