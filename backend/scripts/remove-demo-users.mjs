/**
 * Elimina las cuentas de demostración del seed antiguo (admin@ / barber@ / client@ @mrkutz.com).
 * Libera FKs (pagos, citas, horarios) antes de borrar usuarios.
 *
 * Uso: npm run remove-demo-users
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAILS = ['admin@mrkutz.com', 'barber@mrkutz.com', 'client@mrkutz.com'];

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: DEMO_EMAILS } },
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      console.log('No hay usuarios demo (@mrkutz.com) en la base de datos. Nada que hacer.');
      return;
    }

    const userIds = users.map((u) => u.id);

    const barbers = await prisma.barber.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const barberIds = barbers.map((b) => b.id);

    const clients = await prisma.client.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const clientIds = clients.map((c) => c.id);

    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { createdBy: { in: userIds } },
        data: { createdBy: null },
      });
      await tx.payment.updateMany({
        where: { voidedBy: { in: userIds } },
        data: { voidedBy: null },
      });
      await tx.inventoryMovement.updateMany({
        where: { createdBy: { in: userIds } },
        data: { createdBy: null },
      });
      await tx.purchase.updateMany({
        where: { createdBy: { in: userIds } },
        data: { createdBy: null },
      });
      await tx.purchase.updateMany({
        where: { voidedBy: { in: userIds } },
        data: { voidedBy: null },
      });

      if (barberIds.length || clientIds.length) {
        const or = [];
        if (barberIds.length) or.push({ barberId: { in: barberIds } });
        if (clientIds.length) or.push({ clientId: { in: clientIds } });
        const appts = await tx.appointment.findMany({
          where: { OR: or },
          select: { id: true },
        });
        const apptIds = appts.map((a) => a.id);
        if (apptIds.length) {
          await tx.payment.deleteMany({ where: { appointmentId: { in: apptIds } } });
          await tx.appointment.deleteMany({ where: { id: { in: apptIds } } });
        }
      }

      if (barberIds.length) {
        await tx.barberSchedule.deleteMany({ where: { barberId: { in: barberIds } } });
        await tx.barber.deleteMany({ where: { id: { in: barberIds } } });
      }

      if (clientIds.length) {
        await tx.client.deleteMany({ where: { id: { in: clientIds } } });
      }

      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });

    console.log('✅ Usuarios demo eliminados:', users.map((u) => u.email).join(', '));
    console.log('   Crea tu admin real con: npm run create-admin (ADMIN_EMAIL / ADMIN_PASSWORD en .env)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
