/**
 * Estandariza los horarios de todos los barberos al horario oficial del negocio.
 *
 * Por qué hace falta: hasta ahora la hora se guardaba interpretándola en la zona
 * horaria del servidor, así que lo almacenado dependía de si el guardado se hizo
 * desde Render (UTC) o desde un equipo local (UTC-5). El resultado son horarios
 * desplazados e incluso imposibles (un domingo guardado como 18:00 → 03:00). El
 * desplazamiento no es uniforme y no queda registro de dónde se guardó cada fila,
 * así que la hora original es irrecuperable: en lugar de adivinar, se aplica el
 * horario oficial y después se ajusta por barbero desde el panel.
 *
 * Uso:
 *   npm run schedules:repair            # simulación: solo muestra qué haría
 *   npm run schedules:repair -- --apply # escribe los cambios
 *
 * Importante: ejecutar SOLO con la corrección de zona horaria ya desplegada. Con
 * el código anterior, cualquier guardado posterior desde el panel volvería a
 * desplazar las horas.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_BARBER_WEEK } from '../src/services/barberScheduleRules.js';
import { parseClockTime, clockTimeToDate } from '../src/services/appointment.time.helpers.js';
import { timeStrFromRecord } from '../src/utils/colombiaTime.js';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--apply');
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Marca las filas que están claramente corruptas, para poder señalarlas. */
const esInvalida = (inicio, fin) => {
  if (!inicio || !fin) return true;
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  return hf * 60 + mf <= hi * 60 + mi;
};

async function main() {
  const barberos = await prisma.barber.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: { id: 'asc' },
  });

  if (barberos.length === 0) {
    console.log('No hay barberos registrados. Nada que hacer.');
    return;
  }

  console.log(APLICAR ? '\n== APLICANDO CAMBIOS ==\n' : '\n== SIMULACIÓN (no se escribe nada) ==\n');

  const filas = [];
  let invalidas = 0;

  for (const b of barberos) {
    const actuales = await prisma.barberSchedule.findMany({
      where: { barberId: b.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    const porDia = new Map(actuales.map((s) => [s.dayOfWeek, s]));

    for (const estandar of DEFAULT_BARBER_WEEK) {
      const actual = porDia.get(estandar.dayOfWeek);
      const inicioActual = actual ? timeStrFromRecord(actual.startTime) : null;
      const finActual = actual ? timeStrFromRecord(actual.endTime) : null;
      const invalida = actual ? esInvalida(inicioActual, finActual) : false;
      if (invalida) invalidas += 1;

      filas.push({
        barbero: `${b.firstName} ${b.lastName}`.trim(),
        dia: DIAS[estandar.dayOfWeek],
        antes: actual ? `${inicioActual}-${finActual}${actual.isAvailable ? '' : ' (cerrado)'}` : '(sin fila)',
        despues: `${estandar.startTime}-${estandar.endTime}`,
        estado: invalida ? 'INVÁLIDA' : actual ? '' : 'FALTABA',
      });
    }

    if (APLICAR) {
      // upsert sobre la restricción única [barberId, dayOfWeek]: corrige las que
      // existen y crea las que falten, sin borrar nada por el camino.
      for (const estandar of DEFAULT_BARBER_WEEK) {
        const datos = {
          startTime: clockTimeToDate(parseClockTime(estandar.startTime)),
          endTime: clockTimeToDate(parseClockTime(estandar.endTime)),
          isAvailable: estandar.isAvailable,
        };
        await prisma.barberSchedule.upsert({
          where: { barberId_dayOfWeek: { barberId: b.id, dayOfWeek: estandar.dayOfWeek } },
          update: datos,
          create: { barberId: b.id, dayOfWeek: estandar.dayOfWeek, ...datos },
        });
      }
    }
  }

  console.table(filas);
  console.log(`Barberos: ${barberos.length} | filas: ${filas.length} | inválidas detectadas: ${invalidas}`);

  if (!APLICAR) {
    console.log('\nNo se escribió nada. Para aplicar: npm run schedules:repair -- --apply');
    console.log('Antes de aplicar conviene respaldar: npm run db:backup\n');
  } else {
    console.log('\nHorarios estandarizados correctamente.\n');
  }
}

main()
  .catch((e) => {
    console.error('Falló la estandarización:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
