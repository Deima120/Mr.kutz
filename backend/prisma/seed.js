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

  // 3. Business settings — MR KUTZ BARBERÍA (datos de perfil Plani)
  await prisma.businessSetting.upsert({
    where: { id: 1 },
    update: {
      businessName: 'Mr. Kutz Barbería',
      address: 'Calle 36 D Sur #27 A-105, Loma del Escobero, Local 142 Piso 1',
      contactPhone: '320 855 1041',
      openingHours: 'Lunes a Sábado: 10:00 am - 8:00 pm. Domingo y Festivos: 11:00 am - 6:00 pm',
    },
    create: {
      id: 1,
      businessName: 'Mr. Kutz Barbería',
      address: 'Calle 36 D Sur #27 A-105, Loma del Escobero, Local 142 Piso 1',
      contactPhone: '320 855 1041',
      openingHours: 'Lunes a Sábado: 10:00 am - 8:00 pm. Domingo y Festivos: 11:00 am - 6:00 pm',
    },
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

  // 8. Servicios MR KUTZ (catálogo profesional según perfil Plani)
  const services = [
    { name: 'Corte', description: 'Corte clásico con terminación profesional', price: 60000, durationMinutes: 35 },
    { name: 'Barba', description: 'Arreglo y perfilado de barba', price: 35000, durationMinutes: 15 },
    { name: 'Corte + Barba', description: 'Combo completo. Corte y barba en una sesión', price: 80000, durationMinutes: 60 },
    { name: 'Corte + Barba Premium', description: 'Experiencia premium con acabados detallados', price: 85000, durationMinutes: 75 },
    { name: 'Barba Premium', description: 'Barba + marcación y cuidado especial', price: 45000, durationMinutes: 30 },
    { name: 'Barba + Marcación', description: 'Perfilado y marcación de barba', price: 45000, durationMinutes: 30 },
    { name: 'Contorno De Barba', description: 'Definición y contorno de barba', price: 10000, durationMinutes: 5 },
    { name: 'Corte Niño', description: 'Corte para los más pequeños', price: 55000, durationMinutes: 30 },
    { name: 'Corte De Puntas', description: 'Recorte y mantenimiento de puntas', price: 20000, durationMinutes: 15 },
    { name: 'Moldeo', description: 'Moldeo y fijación del cabello', price: 20000, durationMinutes: 15 },
    { name: 'Moldeo Y Peinado', description: 'Moldeo y peinado profesional', price: 35000, durationMinutes: 10 },
    { name: 'Lavado De Cabello', description: 'Lavado y cuidado del cabello', price: 25000, durationMinutes: 10 },
    { name: 'Rayas O Tribal', description: 'Diseño en rayas o tribal', price: 25000, durationMinutes: 10 },
    { name: 'Corte + Cejas', description: 'Corte con arreglo de cejas', price: 70000, durationMinutes: 45 },
    { name: 'Corte + Barba + Cejas', description: 'Combo completo con cejas', price: 90000, durationMinutes: 60 },
    { name: 'Barba + Cejas', description: 'Barba y arreglo de cejas', price: 48000, durationMinutes: 25 },
    { name: 'Cejas Con Cera/Hilo', description: 'Diseño de cejas con cera o hilo', price: 35000, durationMinutes: 15 },
    { name: 'Cejas Con Barbera', description: 'Arreglo de cejas con navaja', price: 18000, durationMinutes: 15 },
    { name: 'Barba + Limpieza Facial', description: 'Barba y limpieza facial', price: 43000, durationMinutes: 30 },
    { name: 'Depilación Nasal', description: 'Depilación de vello nasal', price: 23000, durationMinutes: 15 },
    { name: 'Depilación Nasal/Oídos', description: 'Depilación nasal y de oídos', price: 33000, durationMinutes: 20 },
    { name: 'Bozo En Cera', description: 'Depilación de bozo con cera', price: 20000, durationMinutes: 15 },
    { name: 'Limpieza Facial', description: 'Limpieza facial profesional', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla De Puntos Negros', description: 'Tratamiento con mascarilla puntos negros', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla Velo', description: 'Mascarilla en velo', price: 21000, durationMinutes: 15 },
    { name: 'Mascarilla Gold Mask', description: 'Mascarilla oro', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla Gris De Murano', description: 'Mascarilla Gris Murano', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla De Parches De Ojos', description: 'Parches para contorno de ojos', price: 21000, durationMinutes: 15 },
    { name: 'Combo Mascarillas', description: 'Combo de mascarillas faciales', price: 55000, durationMinutes: 45 },
    { name: 'Exfoliación Facial', description: 'Exfoliación facial', price: 20000, durationMinutes: 15 },
    { name: 'Cubrimiento De Canas', description: 'Cubrimiento de canas', price: 80000, durationMinutes: 60 },
    { name: 'Color Full', description: 'Coloración completa', price: 250000, durationMinutes: 300 },
    { name: 'Aplicación De Matizante', description: 'Aplicación de matizante', price: 40000, durationMinutes: 35 },
    { name: 'Pigmentación De Barba', description: 'Pigmentación de barba', price: 20000, durationMinutes: 15 },
    { name: 'Alissado 5 Min', description: 'Alissado express', price: 55000, durationMinutes: 15 },
  ];
  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) {
      await prisma.service.create({ data: svc });
    }
  }
  console.log('✅ Servicios MR KUTZ verificados');

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
