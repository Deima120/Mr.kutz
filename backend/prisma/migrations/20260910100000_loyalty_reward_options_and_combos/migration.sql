-- Fidelizacion: opciones de premio elegibles por hito (antes, un hito otorgaba
-- una lista fija de items sin eleccion) + relacion real de que servicios
-- individuales componen cada "combo" (antes, un combo era solo un Service mas
-- con su propio nombre/precio, sin ningun vinculo a los servicios que agrupa).
--
-- IMPORTANTE: "loyalty_milestone_reward_items" YA tiene filas reales (3,
-- verificado antes de escribir esto: "cada 5"->Barba, "cada 10"->Barba+Cejas y
-- Cerveza). No se puede simplemente soltar rule_id y agregar option_id NOT
-- NULL de una -Postgres lo rechaza sin un valor para las filas existentes-,
-- asi que cada regla existente se envuelve primero en su propia opcion
-- (unica), se migran las filas, y solo entonces se retira rule_id. Mismo
-- cuidado para "client_loyalty_rewards.chosen_option_id": se backfillea con la
-- opcion migrada de su regla, para no dejar huerfano ningun premio ya
-- otorgado hoy (incluido el del cliente de prueba).

-- 1) Tabla nueva de opciones por hito.
CREATE TABLE "loyalty_milestone_reward_options" (
    "id" SERIAL NOT NULL,
    "rule_id" INTEGER NOT NULL,

    CONSTRAINT "loyalty_milestone_reward_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_milestone_reward_options_rule_id_idx"
  ON "loyalty_milestone_reward_options" ("rule_id");

ALTER TABLE "loyalty_milestone_reward_options"
  ADD CONSTRAINT "loyalty_milestone_reward_options_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "loyalty_milestone_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Una opcion por cada regla que YA tenga items (preserva el comportamiento
-- actual: todos sus items siguen siendo una sola opcion, "la unica").
INSERT INTO "loyalty_milestone_reward_options" ("rule_id")
SELECT DISTINCT "rule_id" FROM "loyalty_milestone_reward_items";

-- 3) option_id nullable por ahora, para poder rellenarlo antes de exigirlo.
ALTER TABLE "loyalty_milestone_reward_items" ADD COLUMN "option_id" INTEGER;

UPDATE "loyalty_milestone_reward_items" i
SET "option_id" = o."id"
FROM "loyalty_milestone_reward_options" o
WHERE o."rule_id" = i."rule_id";

ALTER TABLE "loyalty_milestone_reward_items" ALTER COLUMN "option_id" SET NOT NULL;

-- 4) Fuera la relacion vieja directa a la regla.
ALTER TABLE "loyalty_milestone_reward_items" DROP CONSTRAINT "loyalty_milestone_reward_items_rule_id_fkey";
DROP INDEX "loyalty_milestone_reward_items_rule_id_idx";
ALTER TABLE "loyalty_milestone_reward_items" DROP COLUMN "rule_id";

CREATE INDEX "loyalty_milestone_reward_items_option_id_idx"
  ON "loyalty_milestone_reward_items" ("option_id");

ALTER TABLE "loyalty_milestone_reward_items"
  ADD CONSTRAINT "loyalty_milestone_reward_items_option_id_fkey"
  FOREIGN KEY ("option_id") REFERENCES "loyalty_milestone_reward_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Que opcion eligio cada premio ya otorgado. Nullable (queda "pendiente de
-- elegir" para hitos futuros con 2+ opciones), pero se backfillea ya mismo con
-- la unica opcion migrada de su regla.
ALTER TABLE "client_loyalty_rewards" ADD COLUMN "chosen_option_id" INTEGER;

UPDATE "client_loyalty_rewards" r
SET "chosen_option_id" = o."id"
FROM "loyalty_milestone_reward_options" o
WHERE o."rule_id" = r."rule_id";

ALTER TABLE "client_loyalty_rewards"
  ADD CONSTRAINT "client_loyalty_rewards_chosen_option_id_fkey"
  FOREIGN KEY ("chosen_option_id") REFERENCES "loyalty_milestone_reward_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6) Que servicios individuales compone cada combo real (categoria "Combos").
-- La tabla nace vacia: un script aparte, verificado servicio por servicio
-- contra el catalogo real, rellena la composicion de los 7 combos existentes.
CREATE TABLE "_ComboComponents" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_ComboComponents_AB_unique" ON "_ComboComponents"("A", "B");
CREATE INDEX "_ComboComponents_B_index" ON "_ComboComponents"("B");

ALTER TABLE "_ComboComponents"
  ADD CONSTRAINT "_ComboComponents_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ComboComponents"
  ADD CONSTRAINT "_ComboComponents_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
