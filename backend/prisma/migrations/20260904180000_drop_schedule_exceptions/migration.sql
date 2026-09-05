-- Retira la tabla de excepciones del calendario.
--
-- El módulo de festivos y cierres se quitó del software: no figuraba en la ficha
-- ni en la documentación del proyecto. El diseño completo queda documentado en
-- `docs/MODULO-FESTIVOS-Y-CIERRES.md` por si algún día se retoma.
--
-- Seguridad de la operación, verificada antes de escribir esta migración:
--   - La tabla estaba VACÍA (0 filas).
--   - No tenía ninguna llave foránea, ni hacia otras tablas ni desde ellas, así
--     que borrarla no puede dejar registros huérfanos en ningún sitio.
--
-- La migración original que la creaba (20260904120000_schedule_exceptions) se
-- conserva a propósito en el historial: ya está registrada como aplicada, y
-- borrar su carpeta rompería `prisma migrate status`.

DROP TABLE IF EXISTS "schedule_exceptions";
