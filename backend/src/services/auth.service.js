/**
 * Auth Service - Lógica de negocio de autenticación
 * Maneja registro, login y generación de tokens
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Registra un nuevo usuario
 * @param {Object} userData - email, password, role, firstName, lastName, phone
 * @returns {Object} Usuario creado sin password
 */
export const register = async (userData) => {
  const { email, password, role = 'client', firstName, lastName, phone } = userData;

  const client = await pool.connect();

  try {
    // Verificar si el email ya existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    // Obtener role_id
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [role]
    );

    if (roleResult.rows.length === 0) {
      const error = new Error('Invalid role');
      error.statusCode = 400;
      throw error;
    }

    const roleId = roleResult.rows[0].id;

    // Hash de contraseña (protección contra SQL injection: usamos parámetros)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query('BEGIN');

    // Crear usuario
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, email, role_id, is_active, created_at`,
      [email.toLowerCase(), passwordHash, roleId]
    );

    const user = userResult.rows[0];

    // Crear registro en tabla según rol
    if (role === 'client') {
      await client.query(
        `INSERT INTO clients (user_id, first_name, last_name, phone, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, firstName || '', lastName || '', phone || null, email.toLowerCase()]
      );
    } else if (role === 'barber') {
      await client.query(
        `INSERT INTO barbers (user_id, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4)`,
        [user.id, firstName || '', lastName || '', phone || null]
      );
    }

    await client.query('COMMIT');

    const token = generateToken(user.id);
    return {
      user: formatUserResponse(user, { firstName, lastName, role }),
      token,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Autentica usuario y devuelve token
 * @param {string} email
 * @param {string} password
 * @returns {Object} user + token
 */
export const login = async (email, password) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.role_id, u.is_active, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const dbUser = result.rows[0];

  if (!dbUser.is_active) {
    const error = new Error('Account is inactive');
    error.statusCode = 401;
    throw error;
  }

  if (!dbUser.password_hash) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, dbUser.password_hash);
  } catch (bcryptError) {
    console.error('Login bcrypt error:', bcryptError?.message || bcryptError);
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!isValidPassword) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(dbUser.id);
  const user = formatUserResponse(dbUser);

  return { user, token };
};

/**
 * Obtiene perfil del usuario autenticado
 */
export const getProfile = async (userId) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role_id, u.is_active, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const dbUser = result.rows[0];
  let profile = formatUserResponse(dbUser);

  if (dbUser.role_name === 'client') {
    const clientResult = await pool.query(
      'SELECT id as client_id, first_name, last_name, phone FROM clients WHERE user_id = $1',
      [userId]
    );
    if (clientResult.rows[0]) {
      const { client_id, ...rest } = clientResult.rows[0];
      profile = { ...profile, clientId: client_id, ...rest };
    }
  } else if (dbUser.role_name === 'barber') {
    const barberResult = await pool.query(
      'SELECT id as barber_id, first_name, last_name, phone, specialties FROM barbers WHERE user_id = $1',
      [userId]
    );
    if (barberResult.rows[0]) {
      const { barber_id, ...rest } = barberResult.rows[0];
      profile = { ...profile, barberId: barber_id, ...rest };
    }
  }

  return profile;
};

/**
 * Genera JWT
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: TOKEN_EXPIRES }
  );
};

/**
 * Formatea respuesta de usuario (sin datos sensibles)
 */
const formatUserResponse = (dbUser, extra = {}) => {
  const { password_hash, ...safeUser } = dbUser;
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role_name || extra.role,
    isActive: dbUser.is_active,
    firstName: extra.firstName,
    lastName: extra.lastName,
    ...safeUser,
  };
};
