-- Excepciones del calendario de la barbería: cierres puntuales y horarios
-- especiales que el administrador marca a mano.
--
-- Los festivos colombianos NO viven aquí: se calculan en código
-- (src/utils/colombianHolidays.js) para no depender de que alguien los cargue
-- cada año. Esta tabla cubre solo lo que ningún calendario puede saber, y una
-- excepción manda siempre sobre el festivo calculado.
--
-- Migración puramente aditiva: no toca ninguna tabla existente.

CREATE TABLE IF NOT EXISTS "schedule_exceptions" (
  "id"         SERIAL       NOT NULL,
  "date"       DATE         NOT NULL,
  "is_closed"  BOOLEAN      NOT NULL DEFAULT false,
  "start_time" TIME(6),
  "end_time"   TIME(6),
  "reason"     VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- Una sola excepción por fecha: permite resolver el día con una única consulta
-- y hace natural el upsert desde el panel. El nombre sigue el formato que genera
-- Prisma por defecto para que `migrate dev` no intente recrearlo.
CREATE UNIQUE INDEX IF NOT EXISTS "schedule_exceptions_date_key"
  ON "schedule_exceptions" ("date");
