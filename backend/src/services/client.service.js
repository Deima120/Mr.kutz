/**
 * Client Service - Lógica de negocio de gestión de clientes
 */

import pool from '../config/database.js';

/**
 * Obtiene lista de clientes con paginación y búsqueda opcional
 */
export const getAll = async ({ search, limit = 50, offset = 0 }) => {
  const params = [];
  let paramIndex = 1;
  let whereClause = '';

  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereClause = ` AND (c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
    params.push(searchTerm);
    paramIndex++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int as total FROM clients c WHERE 1=1${whereClause}`,
    params
  );

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.first_name, c.last_name, c.phone, c.email, c.notes, c.created_at
     FROM clients c WHERE 1=1${whereClause}
     ORDER BY c.last_name, c.first_name
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    clients: result.rows,
    total: countResult.rows[0]?.total || 0,
    limit,
    offset,
  };
};

/**
 * Obtiene un cliente por ID
 */
export const getById = async (id) => {
  const result = await pool.query(
    `SELECT id, user_id, first_name, last_name, phone, email, notes, created_at, updated_at
     FROM clients WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Crea un nuevo cliente
 */
export const create = async (data) => {
  const { firstName, lastName, phone, email, notes, userId } = data;

  const result = await pool.query(
    `INSERT INTO clients (first_name, last_name, phone, email, notes, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, first_name, last_name, phone, email, notes, created_at`,
    [firstName, lastName || null, phone || null, email || null, notes || null, userId || null]
  );

  return result.rows[0];
};

/**
 * Actualiza un cliente
 */
export const update = async (id, data) => {
  const { firstName, lastName, phone, email, notes } = data;

  const result = await pool.query(
    `UPDATE clients SET
       first_name = COALESCE($2, first_name),
       last_name = COALESCE($3, last_name),
       phone = COALESCE($4, phone),
       email = COALESCE($5, email),
       notes = COALESCE($6, notes),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, user_id, first_name, last_name, phone, email, notes, created_at, updated_at`,
    [id, firstName, lastName, phone, email, notes]
  );

  return result.rows[0] || null;
};

/**
 * Elimina un cliente
 */
export const remove = async (id) => {
  const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};

/**
 * Obtiene historial de servicios/citas de un cliente
 */
export const getServiceHistory = async (clientId) => {
  const result = await pool.query(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes,
            s.name as service_name, s.price, s.duration_minutes,
            b.first_name as barber_first_name, b.last_name as barber_last_name
     FROM appointments a
     JOIN services s ON a.service_id = s.id
     JOIN barbers b ON a.barber_id = b.id
     WHERE a.client_id = $1
     ORDER BY a.appointment_date DESC, a.start_time DESC
     LIMIT 100`,
    [clientId]
  );

  return result.rows;
};
