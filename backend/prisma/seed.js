/**
 * Seed - Deja la base de datos funcional para catálogo y ajustes
 * Crea roles, métodos de pago, negocio y servicios.
 * Usuarios: crea el admin con `npm run create-admin` (ADMIN_EMAIL / ADMIN_PASSWORD en .env).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // 4. Categorías de servicios (catálogo Mr. Kutz)
  const serviceCategoryDefs = [
    { name: 'Cortes', description: 'Cortes de cabello, moldeo, lavado y acabados' },
    { name: 'Barba', description: 'Arreglo, perfilado y barba premium' },
    { name: 'Combos', description: 'Paquetes que combinan varios servicios' },
    { name: 'Cejas', description: 'Diseño y arreglo de cejas' },
    { name: 'Depilación', description: 'Cera, nasal, oídos y bozo' },
    { name: 'Facial', description: 'Limpieza, mascarillas y exfoliación' },
    { name: 'Coloración', description: 'Tintes, matiz, canas y pigmentación' },
  ];
  for (const c of serviceCategoryDefs) {
    await prisma.serviceCategory.upsert({
      where: { name: c.name },
      update: { description: c.description, isActive: true },
      create: { name: c.name, description: c.description },
    });
  }
  const categoriesByName = Object.fromEntries(
    (await prisma.serviceCategory.findMany()).map((row) => [row.name, row.id])
  );

  // 5. Servicios MR KUTZ — cada ítem con categoría (mismo catálogo Plani)
  const services = [
    { name: 'Corte', category: 'Cortes', description: 'Corte clásico con terminación profesional', price: 60000, durationMinutes: 35 },
    { name: 'Barba', category: 'Barba', description: 'Arreglo y perfilado de barba', price: 35000, durationMinutes: 15 },
    { name: 'Corte + Barba', category: 'Combos', description: 'Combo completo. Corte y barba en una sesión', price: 80000, durationMinutes: 60 },
    { name: 'Corte + Barba Premium', category: 'Combos', description: 'Experiencia premium con acabados detallados', price: 85000, durationMinutes: 75 },
    { name: 'Barba Premium', category: 'Barba', description: 'Barba + marcación y cuidado especial', price: 45000, durationMinutes: 30 },
    { name: 'Barba + Marcación', category: 'Barba', description: 'Perfilado y marcación de barba', price: 45000, durationMinutes: 30 },
    { name: 'Contorno De Barba', category: 'Barba', description: 'Definición y contorno de barba', price: 10000, durationMinutes: 5 },
    { name: 'Corte Niño', category: 'Cortes', description: 'Corte para los más pequeños', price: 55000, durationMinutes: 30 },
    { name: 'Corte De Puntas', category: 'Cortes', description: 'Recorte y mantenimiento de puntas', price: 20000, durationMinutes: 15 },
    { name: 'Moldeo', category: 'Cortes', description: 'Moldeo y fijación del cabello', price: 20000, durationMinutes: 15 },
    { name: 'Moldeo Y Peinado', category: 'Cortes', description: 'Moldeo y peinado profesional', price: 35000, durationMinutes: 10 },
    { name: 'Lavado De Cabello', category: 'Cortes', description: 'Lavado y cuidado del cabello', price: 25000, durationMinutes: 10 },
    { name: 'Rayas O Tribal', category: 'Cortes', description: 'Diseño en rayas o tribal', price: 25000, durationMinutes: 10 },
    { name: 'Corte + Cejas', category: 'Combos', description: 'Corte con arreglo de cejas', price: 70000, durationMinutes: 45 },
    { name: 'Corte + Barba + Cejas', category: 'Combos', description: 'Combo completo con cejas', price: 90000, durationMinutes: 60 },
    { name: 'Barba + Cejas', category: 'Combos', description: 'Barba y arreglo de cejas', price: 48000, durationMinutes: 25 },
    { name: 'Cejas Con Cera/Hilo', category: 'Cejas', description: 'Diseño de cejas con cera o hilo', price: 35000, durationMinutes: 15 },
    { name: 'Cejas Con Barbera', category: 'Cejas', description: 'Arreglo de cejas con navaja', price: 18000, durationMinutes: 15 },
    { name: 'Barba + Limpieza Facial', category: 'Combos', description: 'Barba y limpieza facial', price: 43000, durationMinutes: 30 },
    { name: 'Depilación Nasal', category: 'Depilación', description: 'Depilación de vello nasal', price: 23000, durationMinutes: 15 },
    { name: 'Depilación Nasal/Oídos', category: 'Depilación', description: 'Depilación nasal y de oídos', price: 33000, durationMinutes: 20 },
    { name: 'Bozo En Cera', category: 'Depilación', description: 'Depilación de bozo con cera', price: 20000, durationMinutes: 15 },
    { name: 'Limpieza Facial', category: 'Facial', description: 'Limpieza facial profesional', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla De Puntos Negros', category: 'Facial', description: 'Tratamiento con mascarilla puntos negros', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla Velo', category: 'Facial', description: 'Mascarilla en velo', price: 21000, durationMinutes: 15 },
    { name: 'Mascarilla Gold Mask', category: 'Facial', description: 'Mascarilla oro', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla Gris De Murano', category: 'Facial', description: 'Mascarilla Gris Murano', price: 25000, durationMinutes: 15 },
    { name: 'Mascarilla De Parches De Ojos', category: 'Facial', description: 'Parches para contorno de ojos', price: 21000, durationMinutes: 15 },
    { name: 'Combo Mascarillas', category: 'Combos', description: 'Combo de mascarillas faciales', price: 55000, durationMinutes: 45 },
    { name: 'Exfoliación Facial', category: 'Facial', description: 'Exfoliación facial', price: 20000, durationMinutes: 15 },
    { name: 'Cubrimiento De Canas', category: 'Coloración', description: 'Cubrimiento de canas', price: 80000, durationMinutes: 60 },
    { name: 'Color Full', category: 'Coloración', description: 'Coloración completa', price: 250000, durationMinutes: 300 },
    { name: 'Aplicación De Matizante', category: 'Coloración', description: 'Aplicación de matizante', price: 40000, durationMinutes: 35 },
    { name: 'Pigmentación De Barba', category: 'Coloración', description: 'Pigmentación de barba', price: 20000, durationMinutes: 15 },
    { name: 'Alissado 5 Min', category: 'Cortes', description: 'Alissado express', price: 55000, durationMinutes: 15 },
  ];

  for (const row of services) {
    const { category, name, description, price, durationMinutes } = row;
    const categoryId = categoriesByName[category] ?? null;
    const existing = await prisma.service.findFirst({ where: { name } });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          categoryId,
          description,
          price,
          durationMinutes,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          name,
          description,
          price,
          durationMinutes,
          categoryId,
        },
      });
    }
  }

  // 6. Eliminar categorías legacy «Barbas» / «General»: reasignar servicios y borrar filas
  const barbaMain = await prisma.serviceCategory.findUnique({ where: { name: 'Barba' } });
  const cortesMain = await prisma.serviceCategory.findUnique({ where: { name: 'Cortes' } });
  const legacyCats = await prisma.serviceCategory.findMany({
    where: {
      OR: [
        { name: { equals: 'Barbas', mode: 'insensitive' } },
        { name: { equals: 'General', mode: 'insensitive' } },
      ],
    },
  });
  for (const leg of legacyCats) {
    const key = leg.name.trim().toLowerCase();
    const targetId = key === 'barbas' ? barbaMain?.id : key === 'general' ? cortesMain?.id : null;
    if (!targetId || leg.id === targetId) continue;
    await prisma.service.updateMany({ where: { categoryId: leg.id }, data: { categoryId: targetId } });
    await prisma.serviceCategory.delete({ where: { id: leg.id } });
  }
  if (cortesMain) {
    await prisma.service.updateMany({ where: { categoryId: null }, data: { categoryId: cortesMain.id } });
  }
  console.log('✅ Categorías y servicios MR KUTZ sincronizados (sin Barbas/General)');

  console.log('\n🎉 Seed completado.');
  console.log('   Cuenta admin: en .env define ADMIN_EMAIL y ADMIN_PASSWORD y ejecuta: npm run create-admin');
  console.log('   Si venías de datos demo: npm run remove-demo-users');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
