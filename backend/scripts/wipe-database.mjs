/**
 * ⚠️  BORRADO TOTAL DE LA BASE DE DATOS  ⚠️
 *
 * Vacía TODAS las tablas de datos del esquema `public` (TRUNCATE ... RESTART IDENTITY CASCADE),
 * dejando la base lista para arrancar producción desde cero.
 *
 * NO toca `_prisma_migrations`: el historial de migraciones debe sobrevivir para que
 * `prisma migrate deploy` siga funcionando y no intente re-aplicar todo.
 *
 * Es IRREVERSIBLE. Ejecutar SIEMPRE `npm run db:backup` antes.
 *
 * Uso (la confirmación es obligatoria y literal):
 *   node scripts/wipe-database.mjs --si-borrar-todo
 *
 * Después del borrado hay que ejecutar:
 *   npm run db:seed        # roles, métodos de pago, ajustes, categorías y servicios
 *   npm run create-admin   # cuenta admin desde ADMIN_EMAIL / ADMIN_PASSWORD
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const CONFIRM_FLAG = '--si-borrar-todo';

/** Tablas que NO se vacían. */
const PRESERVE = new Set(['_prisma_migrations']);

async function main() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    console.error('❌ Operación destructiva no confirmada.');
    console.error(`   Para ejecutarla: node scripts/wipe-database.mjs ${CONFIRM_FLAG}`);
    console.error('   Antes, respalda con: npm run db:backup');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    console.log('⚠️  BORRADO TOTAL');
    console.log(`   host:     ${dbUrl.hostname}`);
    console.log(`   database: ${dbUrl.pathname.replace(/^\//, '')}\n`);

    const rows = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    );
    const targets = rows.map((r) => r.tablename).filter((t) => !PRESERVE.has(t));

    console.log('Conteo ANTES del borrado:');
    const before = {};
    for (const t of targets) {
      const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${t}"`);
      before[t] = count;
      if (count > 0) console.log(`  ${t.padEnd(24)} ${count}`);
    }
    const totalBefore = Object.values(before).reduce((a, b) => a + b, 0);
    console.log(`  TOTAL: ${totalBefore} registros en ${targets.length} tablas\n`);

    // Un solo TRUNCATE para todas: CASCADE resuelve las FKs sin importar el orden,
    // RESTART IDENTITY deja los autoincrementales en 1 (IDs limpios para producción).
    const list = targets.map((t) => `"${t}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

    console.log('🗑️  TRUNCATE ejecutado. Verificando...\n');

    let totalAfter = 0;
    const leftovers = [];
    for (const t of targets) {
      const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${t}"`);
      totalAfter += count;
      if (count > 0) leftovers.push(`${t} (${count})`);
    }

    if (totalAfter === 0) {
      console.log(`✅ Base vacía: ${totalBefore} registros eliminados, ${targets.length} tablas en 0.`);
      console.log('   `_prisma_migrations` se conservó intacta.');
      console.log('\nSiguiente paso:');
      console.log('   npm run db:seed');
      console.log('   npm run create-admin');
    } else {
      console.error(`❌ Quedaron registros sin borrar: ${leftovers.join(', ')}`);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Falló el borrado:', err?.message || err);
  process.exit(1);
});
