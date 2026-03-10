/**
 * Dashboard Service - Estadísticas y métricas
 */

import pool from '../config/database.js';

export const getStats = async (dateFrom, dateTo) => {
  const from = dateFrom || new Date().toISOString().slice(0, 10);
  const to = dateTo || from;

  const [sales, appointments, servicesTop, barbersTop, lowStock, clientsCount] =
    await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric as total, COUNT(*)::int as count
         FROM payments WHERE created_at::date BETWEEN $1 AND $2`,
        [from, to]
      ),
      pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed', 'in_progress')) as pending,
           COUNT(*) as total
         FROM appointments WHERE appointment_date BETWEEN $1 AND $2`,
        [from, to]
      ),
      pool.query(
        `SELECT s.name, COUNT(a.id) as count
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         WHERE a.appointment_date BETWEEN $1 AND $2 AND a.status = 'completed'
         GROUP BY s.id, s.name ORDER BY count DESC LIMIT 5`,
        [from, to]
      ),
      pool.query(
        `SELECT b.first_name, b.last_name, COUNT(a.id) as count
         FROM appointments a
         JOIN barbers b ON a.barber_id = b.id
         WHERE a.appointment_date BETWEEN $1 AND $2 AND a.status = 'completed'
         GROUP BY b.id, b.first_name, b.last_name ORDER BY count DESC LIMIT 5`,
        [from, to]
      ),
      pool.query(
        `SELECT COUNT(*)::int as count
         FROM products p
         LEFT JOIN inventory i ON p.id = i.product_id
         WHERE p.is_active AND COALESCE(i.quantity, 0) <= p.min_stock`
      ),
      pool.query('SELECT COUNT(*)::int as count FROM clients'),
    ]);

  return {
    sales: sales.rows[0],
    appointments: appointments.rows[0],
    topServices: servicesTop.rows,
    topBarbers: barbersTop.rows,
    lowStockCount: lowStock.rows[0]?.count ?? 0,
    totalClients: clientsCount.rows[0]?.count ?? 0,
    period: { from, to },
  };
};
