/**
 * Barber Service - Gestión de barberos
 */

import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;

export const getAll = async ({ activeOnly = true } = {}) => {
  const result = await pool.query(
    `SELECT b.id, b.user_id, b.first_name, b.last_name, b.phone, b.specialties, b.is_active, b.created_at,
            u.email
     FROM barbers b
     JOIN users u ON b.user_id = u.id
     ${activeOnly ? 'WHERE b.is_active = true' : ''}
     ORDER BY b.last_name, b.first_name`
  );
  return result.rows;
};

export const getById = async (id) => {
  const result = await pool.query(
    `SELECT b.id, b.user_id, b.first_name, b.last_name, b.phone, b.specialties, b.is_active, b.created_at, b.updated_at,
            u.email
     FROM barbers b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const getSchedules = async (barberId) => {
  const result = await pool.query(
    `SELECT id, day_of_week, start_time, end_time, is_available
     FROM barber_schedules
     WHERE barber_id = $1
     ORDER BY day_of_week`,
    [barberId]
  );
  return result.rows;
};

export const create = async (data) => {
  const { email, password, firstName, lastName, phone, specialties } = data;
  const client = await pool.connect();

  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      throw err;
    }

    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'barber'"
    );
    if (roleResult.rows.length === 0) {
      const err = new Error('Barber role not found');
      err.statusCode = 500;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, email`,
      [email.toLowerCase(), passwordHash, roleResult.rows[0].id]
    );
    const user = userResult.rows[0];

    const barberResult = await client.query(
      `INSERT INTO barbers (user_id, first_name, last_name, phone, specialties)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, first_name, last_name, phone, specialties, is_active, created_at`,
      [user.id, firstName, lastName, phone || null, specialties || []]
    );

    await client.query('COMMIT');

    return {
      ...barberResult.rows[0],
      email: user.email,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const update = async (id, data) => {
  const { firstName, lastName, phone, specialties, isActive } = data;
  const result = await pool.query(
    `UPDATE barbers SET
       first_name = COALESCE($2, first_name),
       last_name = COALESCE($3, last_name),
       phone = COALESCE($4, phone),
       specialties = COALESCE($5, specialties),
       is_active = COALESCE($6, is_active),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, user_id, first_name, last_name, phone, specialties, is_active, created_at, updated_at`,
    [id, firstName, lastName, phone, specialties, isActive]
  );

  if (result.rows.length === 0) return null;

  const barber = result.rows[0];
  const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [
    barber.user_id,
  ]);
  return { ...barber, email: userResult.rows[0]?.email };
};

export const updateSchedules = async (barberId, schedules) => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM barber_schedules WHERE barber_id = $1', [
      barberId,
    ]);
    for (const s of schedules) {
      await client.query(
        `INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time, is_available)
         VALUES ($1, $2, $3, $4, $5)`,
        [barberId, s.dayOfWeek, s.startTime, s.endTime, s.isAvailable !== false]
      );
    }
    return getSchedules(barberId);
  } finally {
    client.release();
  }
};
