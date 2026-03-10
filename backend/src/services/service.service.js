/**
 * Service (catalog) - Lógica de negocio de servicios/corte
 */

import pool from '../config/database.js';

export const getAll = async ({ activeOnly = true } = {}) => {
  const result = await pool.query(
    `SELECT id, name, description, price, duration_minutes, is_active, created_at
     FROM services
     ${activeOnly ? 'WHERE is_active = true' : ''}
     ORDER BY name`
  );
  return result.rows;
};

export const getById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, description, price, duration_minutes, is_active, created_at, updated_at
     FROM services WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const create = async (data) => {
  const { name, description, price, durationMinutes } = data;
  const result = await pool.query(
    `INSERT INTO services (name, description, price, duration_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, price, duration_minutes, is_active, created_at`,
    [name, description || null, price, durationMinutes]
  );
  return result.rows[0];
};

export const update = async (id, data) => {
  const { name, description, price, durationMinutes, isActive } = data;
  const result = await pool.query(
    `UPDATE services SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       price = COALESCE($4, price),
       duration_minutes = COALESCE($5, duration_minutes),
       is_active = COALESCE($6, is_active),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, description, price, duration_minutes, is_active, created_at, updated_at`,
    [id, name, description, price, durationMinutes, isActive]
  );
  return result.rows[0] || null;
};

export const remove = async (id) => {
  const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};
