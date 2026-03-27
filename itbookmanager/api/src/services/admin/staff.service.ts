import { db } from '../../db';
import { supabaseAdmin } from '../../supabase';

export type StaffRole = 'system_admin' | 'store_manager' | 'young_creator';

export interface CreateStaffData {
  name: string;
  email: string;
  role: StaffRole;
  phone?: string;
}

function roleToUserType(role: StaffRole): string {
  if (role === 'system_admin') return '시스템관리자';
  if (role === 'store_manager') return '지점관리자';
  return '점주';
}

function userTypeToRole(userType: string): StaffRole {
  if (userType === '시스템관리자') return 'system_admin';
  return 'store_manager';
}

// branch 이름으로 branches 테이블 조회 (선택적)
async function getBranchByName(branchName: string | null) {
  if (!branchName) return null;
  try {
    const r = await db.query(
      'SELECT id, code, name FROM branches WHERE name = $1 LIMIT 1',
      [branchName]
    );
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

// users 행 + branch 정보를 AdminUser 응답 형태로 변환
async function toAdminUser(row: Record<string, unknown>) {
  const branch = await getBranchByName(row.branch as string | null);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: userTypeToRole(row.user_type as string),
    phone: row.phone ?? null,
    is_active: row.status === 'approved',
    store_id: branch?.id ?? null,
    store_code: branch?.code ?? null,
    store_name: branch?.name ?? null,
    created_at: row.created_at,
  };
}

// 기본 users 쿼리 (확정 컬럼만 사용)
const BASE_USER_SELECT = `SELECT id, name, email, user_type, phone, status, branch, created_at FROM users`;

export async function listStaff() {
  const result = await db.query(`${BASE_USER_SELECT} ORDER BY created_at DESC`);
  return Promise.all(result.rows.map(toAdminUser));
}

export async function getStaffById(id: string) {
  const result = await db.query(`${BASE_USER_SELECT} WHERE id::text = $1`, [id]);
  return result.rows[0] ? toAdminUser(result.rows[0]) : null;
}

export async function getMe(adminId: string) {
  const result = await db.query(`${BASE_USER_SELECT} WHERE id::text = $1`, [adminId]);
  return result.rows[0] ? toAdminUser(result.rows[0]) : null;
}

export async function createStaff(data: CreateStaffData) {
  const tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
  let authUid: string | null = null;

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

  // referral_code 생성
  const codeResult = await db.query(
    `SELECT referral_code FROM users WHERE referral_code IS NOT NULL ORDER BY referral_code DESC LIMIT 1`
  );
  let referralCode = 'LAS001';
  if (codeResult.rows[0]?.referral_code) {
    const last = codeResult.rows[0].referral_code as string;
    const num = parseInt(last.replace(/[^0-9]/g, ''), 10);
    referralCode = `LAS${String(num + 1).padStart(3, '0')}`;
  }

  const result = await db.query(
    `INSERT INTO users (auth_uid, name, email, user_type, phone, status, referral_code, password)
     VALUES ($1, $2, $3, $4, $5, 'approved', $6, 'MANAGED_BY_SUPABASE_AUTH')
     RETURNING id, name, email, user_type, phone, status, branch, created_at`,
    [authUid, data.name, data.email, roleToUserType(data.role), data.phone ?? null, referralCode]
  );

  return { staff: await toAdminUser(result.rows[0]), tempPassword };
}

export async function updateStaff(id: string, data: Partial<{
  name: string; role: StaffRole; phone: string; is_active: boolean; storeId: string | null
}>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if ('name' in data)      { fields.push(`name = $${i++}`);      values.push(data.name); }
  if ('role' in data)      { fields.push(`user_type = $${i++}`); values.push(roleToUserType(data.role!)); }
  if ('phone' in data)     { fields.push(`phone = $${i++}`);     values.push(data.phone); }
  if ('is_active' in data) { fields.push(`status = $${i++}`);    values.push(data.is_active ? 'approved' : 'suspended'); }
  if ('storeId' in data && data.storeId) {
    // storeId(UUID) → branch name 조회
    try {
      const br = await db.query('SELECT name FROM branches WHERE id::text = $1', [data.storeId]);
      if (br.rows[0]) { fields.push(`branch = $${i++}`); values.push(br.rows[0].name); }
    } catch { /* ignore */ }
  }

  if (fields.length === 0) return getStaffById(id);

  values.push(id);
  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id::text = $${i}
     RETURNING id, name, email, user_type, phone, status, branch, created_at`,
    values
  );
  return result.rows[0] ? toAdminUser(result.rows[0]) : null;
}

export async function deleteStaff(id: string) {
  const staffResult = await db.query('SELECT auth_uid FROM users WHERE id::text = $1', [id]);
  if (!staffResult.rows[0]) throw new Error('Staff not found');

  const { auth_uid } = staffResult.rows[0];

  if (auth_uid && supabaseAdmin) {
    try { await supabaseAdmin.auth.admin.deleteUser(auth_uid); } catch { /* ignore */ }
  }

  // las-mgmt soft delete
  try {
    await db.query('UPDATE users SET deleted_at = NOW() WHERE id::text = $1', [id]);
  } catch {
    // deleted_at 컬럼 없으면 status로 비활성화
    await db.query("UPDATE users SET status = 'deleted' WHERE id::text = $1", [id]);
  }
  return true;
}

export async function getStaffByName(name: string) {
  const result = await db.query(
    `SELECT id, name, email, user_type, phone, status, branch, created_at, referral_code
     FROM users WHERE LOWER(name) = LOWER($1) AND status = 'approved'
     LIMIT 1`,
    [name.trim()]
  );
  if (!result.rows[0]) return null;
  const staff = await toAdminUser(result.rows[0]);
  return { ...staff, referral_code: result.rows[0].referral_code };
}

export async function getStaffByReferralCode(code: string) {
  // 하이픈 제거 및 대문자 변환 후 조회
  const normalized = code.replace(/-/g, '').toUpperCase();
  const result = await db.query(
    `SELECT id, name, email, user_type, phone, status, branch, created_at, referral_code 
     FROM users WHERE UPPER(REPLACE(referral_code, '-', '')) = $1`,
    [normalized]
  );
  if (!result.rows[0]) return null;
  const staff = await toAdminUser(result.rows[0]);
  return { ...staff, referral_code: result.rows[0].referral_code };
}
