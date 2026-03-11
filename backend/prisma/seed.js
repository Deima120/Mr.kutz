/**
 * Seed - Deja la base de datos 100% funcional
 * Crea roles, payment_methods, business_settings y 3 usuarios de prueba
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const PASSWORD = 'password123';

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Roles (admin, barber, client)
  const roles = [
    { name: 'admin', description: 'Administrador del sistema con acceso total' },
    { name: 'barber', description: 'Barbero con acceso a citas y servicios' },
    { name: 'client', description: 'Cliente con acceso a reservar citas' },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
  }
  console.log('✅ Roles creados');

  // 2. Payment methods
  const paymentMethods = [
    { name: 'cash', description: 'Efectivo' },
    { name: 'card', description: 'Tarjeta débito/crédito' },
    { name: 'transfer', description: 'Transferencia bancaria' },
    { name: 'online', description: 'Pago en línea (futuro)' },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: pm.name },
      update: { description: pm.description },
      create: { ...pm, isActive: true },
    });
  }
  console.log('✅ Métodos de pago creados');

  // 3. Business settings (singleton)
  await prisma.businessSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessName: 'Mr. Kutz' },
  });
  console.log('✅ Configuración de negocio creada');

  // 4. Obtener IDs de roles
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  const barberRole = await prisma.role.findUnique({ where: { name: 'barber' } });
  const clientRole = await prisma.role.findUnique({ where: { name: 'client' } });

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // 5. Usuario admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mrkutz.com' },
    update: { passwordHash },
    create: {
      email: 'admin@mrkutz.com',
      passwordHash,
      roleId: adminRole.id,
    },
  });
  console.log('✅ Usuario admin: admin@mrkutz.com');

  // 6. Usuario barber
  const barberUser = await prisma.user.upsert({
    where: { email: 'barber@mrkutz.com' },
    update: { passwordHash },
    create: {
      email: 'barber@mrkutz.com',
      passwordHash,
      roleId: barberRole.id,
    },
  });
  const barber = await prisma.barber.upsert({
    where: { userId: barberUser.id },
    update: { firstName: 'Carlos', lastName: 'Barber', phone: '+56 9 1234 5678' },
    create: {
      userId: barberUser.id,
      firstName: 'Carlos',
      lastName: 'Barber',
      phone: '+56 9 1234 5678',
      specialties: ['Corte clásico', 'Barba'],
    },
  });
  // Horarios Lun-Sáb 9:00-18:00
  const defaultSchedule = [];
  for (let d = 1; d <= 6; d++) {
    defaultSchedule.push({ barberId: barber.id, dayOfWeek: d, startTime: new Date('1970-01-01T09:00:00'), endTime: new Date('1970-01-01T18:00:00'), isAvailable: true });
  }
  for (const s of defaultSchedule) {
    await prisma.barberSchedule.upsert({
      where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: s.dayOfWeek } },
      update: { startTime: s.startTime, endTime: s.endTime, isAvailable: s.isAvailable },
      create: s,
    });
  }
  console.log('✅ Usuario barber: barber@mrkutz.com');

  // 7. Usuario client
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@mrkutz.com' },
    update: { passwordHash },
    create: {
      email: 'client@mrkutz.com',
      passwordHash,
      roleId: clientRole.id,
    },
  });
  await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: { firstName: 'Pedro', lastName: 'Cliente', phone: '+56 9 8765 4321', email: 'client@mrkutz.com' },
    create: {
      userId: clientUser.id,
      firstName: 'Pedro',
      lastName: 'Cliente',
      phone: '+56 9 8765 4321',
      email: 'client@mrkutz.com',
    },
  });
  console.log('✅ Usuario client: client@mrkutz.com');

  // 8. Servicios de ejemplo (si no existen)
  const services = [
    { name: 'Corte', description: 'Corte clásico', price: 15000, durationMinutes: 30 },
    { name: 'Barba', description: 'Arreglo de barba', price: 8000, durationMinutes: 20 },
    { name: 'Corte + Barba', description: 'Combo completo', price: 20000, durationMinutes: 45 },
  ];
  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) {
      await prisma.service.create({ data: svc });
    }
  }
  console.log('✅ Servicios de ejemplo verificados');

  console.log('\n🎉 Seed completado. Usuarios de prueba:');
  console.log('   admin@mrkutz.com / password123');
  console.log('   barber@mrkutz.com / password123');
  console.log('   client@mrkutz.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
