/**
 * Crea o actualiza un usuario administrador (solo email + contraseña).
 * Uso: define ADMIN_EMAIL y ADMIN_PASSWORD en .env y ejecuta: npm run create-admin
 *
 * El email se guarda igual que en login (normalización Gmail: sin puntos en la parte local, etc.).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { canonicalEmail } from '../src/utils/emailCanonical.js';

const SALT_ROUNDS = 10;

function validatePassword(pw) {
  if (!pw || String(pw).length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(pw)) return 'Incluye al menos una mayúscula.';
  if (!/[a-z]/.test(pw)) return 'Incluye al menos una minúscula.';
  if (!/\d/.test(pw)) return 'Incluye al menos un número.';
  return null;
}

async function main() {
  const raw = String(process.env.ADMIN_EMAIL || '').trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!raw) {
    console.error('Define ADMIN_EMAIL en backend/.env (ej. ADMIN_EMAIL=admin@tudominio.com)');
    process.exit(1);
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    console.error(`ADMIN_PASSWORD: ${pwErr}`);
    process.exit(1);
  }

  const email = canonicalEmail(raw);
  const rawLower = raw.toLowerCase();

  const prisma = new PrismaClient();
  try {
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!adminRole) {
      console.error('No existe el rol "admin". Ejecuta antes: npm run db:seed');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(rawLower !== email ? [{ email: rawLower }] : [])],
      },
    });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          passwordHash,
          roleId: adminRole.id,
          isActive: true,
          resetCode: null,
          resetCodeExpires: null,
        },
      });
      if (existing.email !== email) {
        console.log(`ℹ️  Correo unificado al formato de inicio de sesión: ${existing.email} → ${email}`);
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          roleId: adminRole.id,
        },
      });
    }

    console.log(`✅ Administrador listo: ${user.email}`);
    console.log('   Inicia sesión con ese correo (puedes escribirlo con o sin puntos si es Gmail).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
