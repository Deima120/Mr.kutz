/**
 * Seed: Crea usuario admin inicial para pruebas
 * Ejecutar desde raíz: npm run seed:admin
 * Carga .env desde backend/
 *
 * Variables en backend/.env (opcional):
 *   ADMIN_EMAIL=admin@mrkutz.com
 *   ADMIN_PASSWORD=Admin123
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mrkutz.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';
const SALT_ROUNDS = 10;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'mr_kutz_barbershop',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

async function seedAdmin() {
  const client = await pool.connect();

  try {
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [ADMIN_EMAIL.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      console.log('✅ Admin ya existe:', ADMIN_EMAIL);
      return;
    }

    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );

    if (roleResult.rows.length === 0) {
      throw new Error('Rol admin no encontrado. Ejecuta schema.sql primero.');
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    await client.query(
      `INSERT INTO users (email, password_hash, role_id)
       VALUES ($1, $2, $3)`,
      [ADMIN_EMAIL.toLowerCase(), passwordHash, roleResult.rows[0].id]
    );

    console.log('✅ Admin creado correctamente');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   ⚠️  Cambia la contraseña en producción');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
