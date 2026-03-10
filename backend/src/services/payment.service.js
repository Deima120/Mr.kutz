/**
 * Payment Service - Gestión de pagos
 */

import pool from '../config/database.js';

export const getPaymentMethods = async () => {
  const result = await pool.query(
    'SELECT id, name, description FROM payment_methods WHERE is_active = true ORDER BY name'
  );
  return result.rows;
};

export const getAll = async ({ dateFrom, dateTo, appointmentId, limit = 100, offset = 0 }) => {
  const params = [];
  let paramIndex = 1;
  let where = [];

  if (dateFrom) {
    where.push(`p.created_at::date >= $${paramIndex}`);
    params.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    where.push(`p.created_at::date <= $${paramIndex}`);
    params.push(dateTo);
    paramIndex++;
  }
  if (appointmentId) {
    where.push(`p.appointment_id = $${paramIndex}`);
    params.push(appointmentId);
    paramIndex++;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT p.id, p.appointment_id, p.amount, p.payment_method_id, p.reference, p.notes, p.created_at,
            pm.name as payment_method_name,
            a.appointment_date, a.start_time,
            c.first_name as client_first_name, c.last_name as client_last_name,
            s.name as service_name
     FROM payments p
     LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
     LEFT JOIN appointments a ON p.appointment_id = a.id
     LEFT JOIN clients c ON a.client_id = c.id
     LEFT JOIN services s ON a.service_id = s.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return result.rows;
};

export const getTotalByDateRange = async (dateFrom, dateTo) => {
  const params = [];
  let where = ['1=1'];
  if (dateFrom) {
    params.push(dateFrom);
    where.push(`created_at::date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    where.push(`created_at::date <= $${params.length}`);
  }

  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric as total, COUNT(*)::int as count
     FROM payments
     WHERE ${where.join(' AND ')}`,
    params
  );
  return result.rows[0];
};

export const getById = async (id) => {
  const result = await pool.query(
    `SELECT p.*, pm.name as payment_method_name,
            a.appointment_date, a.start_time, a.client_id, a.service_id,
            c.first_name as client_first_name, c.last_name as client_last_name,
            s.name as service_name, s.price as service_price
     FROM payments p
     LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
     LEFT JOIN appointments a ON p.appointment_id = a.id
     LEFT JOIN clients c ON a.client_id = c.id
     LEFT JOIN services s ON a.service_id = s.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const create = async (data) => {
  const { appointmentId, amount, paymentMethodId, reference, notes, createdBy } = data;
  const result = await pool.query(
    `INSERT INTO payments (appointment_id, amount, payment_method_id, reference, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [appointmentId || null, amount, paymentMethodId, reference || null, notes || null, createdBy || null]
  );
  return result.rows[0];
};

export const remove = async (id) => {
  const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};
