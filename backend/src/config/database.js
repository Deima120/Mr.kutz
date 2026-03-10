/**
 * Configuración de conexión a PostgreSQL
 * Soporta Neon (DATABASE_URL) y PostgreSQL local
 * Usa connection pool para mejor rendimiento
 */

import pg from 'pg';

const { Pool } = pg;

const isNeon = !!process.env.DATABASE_URL;

const poolConfig = isNeon
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mr_kutz_barbershop',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

/**
 * Conecta a la base de datos y verifica la conexión
 */
export const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection error:', error?.message || String(error));
    console.error('   Full error:', error);
    throw error;
  }
};

export default pool;
