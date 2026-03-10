/**
 * Product & Inventory Service
 */

import pool from '../config/database.js';

export const getAll = async ({ activeOnly = true, lowStockOnly = false } = {}) => {
  let query = `
    SELECT p.id, p.name, p.description, p.sku, p.unit, p.min_stock, p.is_active, p.created_at,
           COALESCE(i.quantity, 0) as quantity
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE 1=1
  `;
  const params = [];

  if (activeOnly) {
    query += ' AND p.is_active = true';
  }
  if (lowStockOnly) {
    query += ' AND COALESCE(i.quantity, 0) <= p.min_stock';
  }

  query += ' ORDER BY p.name';

  const result = await pool.query(query, params);
  return result.rows;
};

export const getById = async (id) => {
  const result = await pool.query(
    `SELECT p.*, COALESCE(i.quantity, 0) as quantity
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

export const getLowStock = async () => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.min_stock, COALESCE(i.quantity, 0) as quantity
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.is_active = true AND COALESCE(i.quantity, 0) <= p.min_stock
     ORDER BY COALESCE(i.quantity, 0) ASC`
  );
  return result.rows;
};

export const create = async (data) => {
  const { name, description, sku, unit, minStock } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productResult = await client.query(
      `INSERT INTO products (name, description, sku, unit, min_stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, sku || null, unit || 'unit', minStock ?? 0]
    );
    const product = productResult.rows[0];
    await client.query(
      'INSERT INTO inventory (product_id, quantity) VALUES ($1, 0)',
      [product.id]
    );
    await client.query('COMMIT');
    return { ...product, quantity: 0 };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const update = async (id, data) => {
  const { name, description, sku, unit, minStock, isActive } = data;
  const result = await pool.query(
    `UPDATE products SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       sku = COALESCE($4, sku),
       unit = COALESCE($5, unit),
       min_stock = COALESCE($6, min_stock),
       is_active = COALESCE($7, is_active),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id, name, description, sku, unit, minStock, isActive]
  );
  return result.rows[0] || null;
};

export const updateStock = async (productId, quantityChange, movementType, notes, createdBy) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = await client.query(
      'SELECT quantity FROM inventory WHERE product_id = $1',
      [productId]
    );
    if (inv.rows.length === 0) {
      await client.query('INSERT INTO inventory (product_id, quantity) VALUES ($1, 0)', [
        productId,
      ]);
    }
    const newQty = await client.query(
      `UPDATE inventory SET quantity = quantity + $2, last_updated = CURRENT_TIMESTAMP
       WHERE product_id = $1
       RETURNING quantity`,
      [productId, quantityChange]
    );
    if (newQty.rows[0].quantity < 0) {
      throw new Error('Stock cannot be negative');
    }
    await client.query(
      `INSERT INTO inventory_movements (product_id, quantity_change, movement_type, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, quantityChange, movementType || 'adjustment', notes || null, createdBy]
    );
    await client.query('COMMIT');
    return getById(productId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const remove = async (id) => {
  const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};
