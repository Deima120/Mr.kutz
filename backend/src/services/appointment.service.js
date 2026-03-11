/**
 * Appointment Service - Gestión de citas
 */

import pool from '../config/database.js';

export const getAll = async ({ date, dateFrom, dateTo, barberId, clientId, status, limit = 100, offset = 0 }) => {
  const params = [];
  let paramIndex = 1;
  let where = [];

  if (dateFrom && dateTo) {
    where.push(`a.appointment_date >= $${paramIndex} AND a.appointment_date <= $${paramIndex + 1}`);
    params.push(dateFrom, dateTo);
    paramIndex += 2;
  } else if (date) {
    where.push(`a.appointment_date = $${paramIndex}`);
    params.push(date);
    paramIndex++;
  }
  if (barberId) {
    where.push(`a.barber_id = $${paramIndex}`);
    params.push(barberId);
    paramIndex++;
  }
  if (clientId) {
    where.push(`a.client_id = $${paramIndex}`);
    params.push(clientId);
    paramIndex++;
  }
  if (status) {
    where.push(`a.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderDir = dateFrom && dateTo ? 'ASC' : 'DESC';
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT a.id, a.client_id, a.barber_id, a.service_id, a.appointment_date, a.start_time, a.end_time, a.status, a.notes, a.created_at,
            c.first_name as client_first_name, c.last_name as client_last_name,
            b.first_name as barber_first_name, b.last_name as barber_last_name,
            s.name as service_name, s.price, s.duration_minutes
     FROM appointments a
     JOIN clients c ON a.client_id = c.id
     JOIN barbers b ON a.barber_id = b.id
     JOIN services s ON a.service_id = s.id
     ${whereClause}
     ORDER BY a.appointment_date ${orderDir}, a.start_time ${orderDir}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return result.rows;
};

export const getById = async (id) => {
  const result = await pool.query(
    `SELECT a.*, c.first_name as client_first_name, c.last_name as client_last_name, c.phone as client_phone, c.email as client_email,
            b.first_name as barber_first_name, b.last_name as barber_last_name,
            s.name as service_name, s.price, s.duration_minutes
     FROM appointments a
     JOIN clients c ON a.client_id = c.id
     JOIN barbers b ON a.barber_id = b.id
     JOIN services s ON a.service_id = s.id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const create = async (data) => {
  const { clientId, barberId, serviceId, appointmentDate, startTime, notes } = data;

  const serviceResult = await pool.query(
    'SELECT duration_minutes FROM services WHERE id = $1',
    [serviceId]
  );
  if (serviceResult.rows.length === 0) {
    const err = new Error('Service not found');
    err.statusCode = 400;
    throw err;
  }
  const duration = serviceResult.rows[0].duration_minutes;

  const start = typeof startTime === 'string' && startTime ? startTime : '09:00';
  const parts = start.split(':');
  const h = parseInt(parts[0], 10) || 9;
  const m = parseInt(parts[1], 10) || 0;
  const endMinutes = h * 60 + m + parseInt(duration, 10);
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

  const result = await pool.query(
    `INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, start_time, end_time, notes)
     VALUES ($1, $2, $3, $4, $5::time, $6::time, $7)
     RETURNING *`,
    [clientId, barberId, serviceId, appointmentDate, start, endTime, notes || null]
  );

  return result.rows[0];
};

export const update = async (id, data) => {
  const { appointmentDate, startTime, status, notes } = data;

  let updates = [];
  const params = [id];
  let idx = 2;

  if (appointmentDate) {
    updates.push(`appointment_date = $${idx}`);
    params.push(appointmentDate);
    idx++;
  }
  if (startTime !== undefined) {
    updates.push(`start_time = $${idx}::time`);
    params.push(startTime);
    idx++;
  }
  if (status) {
    updates.push(`status = $${idx}`);
    params.push(status);
    idx++;
  }
  if (notes !== undefined) {
    updates.push(`notes = $${idx}`);
    params.push(notes);
    idx++;
  }

  if (updates.length === 0) {
    return getById(id);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const result = await pool.query(
    `UPDATE appointments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  return result.rows[0] || null;
};

export const getAvailableSlots = async (barberId, date) => {
  const busy = await pool.query(
    `SELECT start_time, end_time FROM appointments
     WHERE barber_id = $1 AND appointment_date = $2 AND status NOT IN ('cancelled', 'no_show')`,
    [barberId, date]
  );

  const slots = [];
  for (let h = 9; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      const isBusy = busy.rows.some((b) => {
        const busyStart = String(b.start_time).slice(0, 5);
        const busyEnd = String(b.end_time).slice(0, 5);
        return start >= busyStart && start < busyEnd;
      });
      if (!isBusy) {
        slots.push(start.slice(0, 5));
      }
    }
  }
  return slots;
};
