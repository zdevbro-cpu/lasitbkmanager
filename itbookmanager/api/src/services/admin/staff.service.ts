import { db } from '../../db';
import { supabaseAdmin } from '../../supabase';

export type StaffRole = 'system_admin' | 'store_manager' | 'young_creator';

export interface CreateStaffData {
  name: string;
  email: string;
  role: StaffRole;
  phone?: string;
}

export async function listStaff() {
  const result = await db.query(
    `SELECT a.id, a.name, a.email, a.role, a.phone, a.is_active, a.created_at,
            a.branch_id AS store_id, b.code AS store_code, b.name AS store_name
     FROM users a
     LEFT JOIN branches b ON b.id = a.branch_id
     ORDER BY a.created_at DESC`
  );
  return result.rows;
}

export async function getStaffById(id: string) {
  const result = await db.query(
    `SELECT a.id, a.name, a.email, a.role, a.phone, a.is_active, a.created_at,
            a.branch_id AS store_id, b.code AS store_code, b.name AS store_name
     FROM users a
     LEFT JOIN branches b ON b.id = a.branch_id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getMe(adminId: string) {
  const result = await db.query(
    `SELECT a.id, a.name, a.email, a.role, a.phone, a.is_active, a.created_at,
            a.branch_id AS store_id, b.code AS store_code, b.name AS store_name
     FROM users a
     LEFT JOIN branches b ON b.id = a.branch_id
     WHERE a.id = $1`,
    [adminId]
  );
  return result.rows[0] ?? null;
}

export async function createStaff(data: CreateStaffData) {
  // 임시 비밀번호 생성 데이터
  const tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
  let authUid: string | null = null;

  // Supabase 계정 생성
  if (supabaseAdmin) {
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: data.name }
    });
    if (error) throw error;
    authUid = user.user.id;
  }

  // DB 등록
  const result = await db.query(
    `INSERT INTO users (auth_uid, name, email, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, phone, is_active, created_at`,
    [authUid, data.name, data.email, data.role, data.phone ?? null]
  );

  return { staff: result.rows[0], tempPassword };
}

export async function updateStaff(id: string, data: Partial<{ name: string; role: StaffRole; phone: string; is_active: boolean; storeId: string | null }>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if ('name' in data)      { fields.push(`name = $${i++}`);      values.push(data.name); }
  if ('role' in data)      { fields.push(`role = $${i++}`);      values.push(data.role); }
  if ('phone' in data)     { fields.push(`phone = $${i++}`);     values.push(data.phone); }
  if ('is_active' in data) { fields.push(`is_active = $${i++}`); values.push(data.is_active); }
  if ('storeId' in data)   { fields.push(`branch_id = $${i++}`);  values.push(data.storeId); }

  if (fields.length === 0) return getStaffById(id);

  values.push(id);
  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
     RETURNING id, name, email, role, phone, is_active, created_at, branch_id AS store_id`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteStaff(id: string) {
  const staffResult = await db.query(
    'SELECT auth_uid FROM users WHERE id = $1',
    [id]
  );
  if (!staffResult.rows[0]) throw new Error('Staff not found');

  const { auth_uid } = staffResult.rows[0];

  // Supabase 계정 삭제
  if (auth_uid && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(auth_uid);
    } catch {
      // 계정이 없어도 DB 삭제는 진행
    }
  }

  await db.query('DELETE FROM users WHERE id = $1', [id]);
  return true;
}
