import { db } from '../../db';

export interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export async function listStores(includeInactive = false): Promise<Store[]> {
  const where = includeInactive ? '' : 'WHERE is_active = TRUE';
  const result = await db.query(
    `SELECT * FROM branches ${where} ORDER BY code ASC`
  );
  return result.rows;
}

export async function getStoreById(id: string): Promise<Store | null> {
  const result = await db.query('SELECT * FROM branches WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getStoreByCode(code: string): Promise<Store | null> {
  const result = await db.query('SELECT * FROM branches WHERE code = $1', [code.toUpperCase()]);
  return result.rows[0] ?? null;
}

export async function createStore(data: {
  code: string; name: string; address?: string; phone?: string;
}): Promise<Store> {
  const result = await db.query(
    `INSERT INTO branches (code, name, address, phone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.code.toUpperCase(), data.name, data.address ?? null, data.phone ?? null]
  );
  return result.rows[0];
}

export async function updateStore(id: string, data: {
  name?: string; address?: string | null; phone?: string | null; is_active?: boolean;
}): Promise<Store | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.name !== undefined)      { fields.push(`name = $${i++}`);      values.push(data.name); }
  if (data.address !== undefined)   { fields.push(`address = $${i++}`);   values.push(data.address); }
  if (data.phone !== undefined)     { fields.push(`phone = $${i++}`);     values.push(data.phone); }
  if (data.is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(data.is_active); }
  if (fields.length === 0) return getStoreById(id);
  values.push(id);
  const result = await db.query(
    `UPDATE branches SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}
