import { db } from '../../db';
import { supabaseAdmin } from '../../supabase';
import { generateQrImage } from '../mdm/tablets.service';

export interface CreateMemberData {
  name: string;
  email: string;
  phone?: string;
  memberType: 'managed' | 'subscription';
  paymentPlanName?: string;
  planAmount?: number;
  planDiscountedAmt?: number;
  paymentMethod?: string;
  assignedInstructor?: string;
  notes?: string;
  createdBy?: string;
  storeId?: string;
}

export interface UpdateMemberData {
  name?: string;
  phone?: string | null;
  paymentPlanName?: string | null;
  planAmount?: number | null;
  planDiscountedAmt?: number | null;
  paymentMethod?: string | null;
  assignedInstructor?: string | null;
  notes?: string | null;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
}

// MBR-NNNNNN 형식 회원 QR 코드 생성
async function generateMemberQrCode(): Promise<string> {
  const result = await db.query(
    "SELECT member_qr_code FROM members WHERE member_qr_code IS NOT NULL ORDER BY CAST(SUBSTRING(member_qr_code FROM 5) AS INTEGER) DESC LIMIT 1"
  );
  if (result.rows.length === 0) return 'MBR-000001';
  const last = result.rows[0].member_qr_code as string;
  const num = parseInt(last.replace('MBR-', '')) + 1;
  return `MBR-${String(num).padStart(6, '0')}`;
}

export async function getMemberQrImage(id: string): Promise<Buffer | null> {
  const result = await db.query('SELECT member_qr_code FROM members WHERE id = $1', [id]);
  const code = result.rows[0]?.member_qr_code as string | undefined;
  if (!code) return null;
  return generateQrImage(code);
}

export async function getMemberByQrCode(code: string) {
  const result = await db.query(
    `SELECT m.*, t.qr_code AS tablet_qr_code, t.model_name AS tablet_model
     FROM members m
     LEFT JOIN tablets t ON t.id = m.current_tablet_id
     WHERE m.member_qr_code = $1`,
    [code.toUpperCase()]
  );
  return result.rows[0] ?? null;
}

// LITB-NNNNN 형식 회원번호 생성 (전체 순번)
async function generateMemberNumber(): Promise<string> {
  const result = await db.query(
    "SELECT COUNT(*) FROM members WHERE member_number LIKE 'LITB-%'"
  );
  const seq = parseInt(result.rows[0].count) + 1;
  return `LITB-${String(seq).padStart(5, '0')}`;
}

export async function listMembers(params: {
  type?: string;
  status?: string;
  search?: string;
  excludeWithdrawn?: boolean;
  storeId?: string;
  page?: number;
  limit?: number;
}) {
  const { type, status, search, excludeWithdrawn, storeId, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (storeId) { conditions.push(`m.store_id = $${i++}`); values.push(storeId); }
  if (type) { conditions.push(`m.member_type = $${i++}::member_type`); values.push(type); }
  if (status) { conditions.push(`m.member_status = $${i++}::member_status`); values.push(status); }
  else if (excludeWithdrawn) { conditions.push(`m.member_status != 'withdrawn'::member_status`); }
  if (search) {
    conditions.push(`(m.name ILIKE $${i} OR m.email ILIKE $${i} OR m.member_number ILIKE $${i} OR m.phone ILIKE $${i})`);
    values.push(`%${search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT m.id, m.member_number, m.member_qr_code, m.name, m.phone, m.email,
              m.member_type, m.member_status, m.payment_plan_name, m.plan_amount,
              m.plan_discounted_amt, m.joined_at, m.last_payment_date, m.next_payment_date,
              m.current_tablet_id, m.assigned_instructor, m.created_at,
              b.code AS store_code, b.name AS store_name
       FROM members m
       LEFT JOIN branches b ON b.id = m.store_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM members m ${where}`, values),
  ]);

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

export async function getMemberById(id: string) {
  const result = await db.query(
    `SELECT m.*,
            t.qr_code AS tablet_qr_code, t.model_name AS tablet_model,
            b.code AS store_code, b.name AS store_name
     FROM members m
     LEFT JOIN tablets t ON t.id = m.current_tablet_id
     LEFT JOIN branches b ON b.id = m.store_id
     WHERE m.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createMember(data: CreateMemberData) {
  const memberNumber = await generateMemberNumber();
  const memberQrCode = await generateMemberQrCode();

  // Supabase 계정 생성 (임시 비밀번호)
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
  let authUid: string | null = null;
  
  if (supabaseAdmin) {
    try {
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: data.name }
      });
      
      if (error) {
        if (error.message.includes('already exists')) {
          // 이미 존재하는 경우 email로 uid 조회
          const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError) {
            authUid = users.users.find(u => u.email === data.email)?.id ?? null;
          }
        } else {
          throw error;
        }
      } else {
        authUid = user.user.id;
      }
    } catch (err) {
      console.error('Supabase user creation failed:', err);
    }
  }

  const result = await db.query(
    `INSERT INTO members (
       member_number, member_qr_code, auth_uid, name, phone, email,
       member_type, payment_plan_name, plan_amount, plan_discounted_amt,
       payment_method, assigned_instructor, notes, created_by, store_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      memberNumber, memberQrCode, authUid, data.name, data.phone ?? null, data.email,
      data.memberType, data.paymentPlanName ?? null, data.planAmount ?? null,
      data.planDiscountedAmt ?? null, data.paymentMethod ?? null,
      data.assignedInstructor ?? null, data.notes ?? null, data.createdBy ?? null,
      data.storeId ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateMember(id: string, data: UpdateMemberData) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const mapping: Record<string, string> = {
    name: 'name', phone: 'phone', paymentPlanName: 'payment_plan_name',
    planAmount: 'plan_amount', planDiscountedAmt: 'plan_discounted_amt',
    paymentMethod: 'payment_method', assignedInstructor: 'assigned_instructor',
    notes: 'notes', lastPaymentDate: 'last_payment_date',
    nextPaymentDate: 'next_payment_date',
  };

  for (const [key, col] of Object.entries(mapping)) {
    if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push((data as Record<string, unknown>)[key]);
    }
  }

  if (fields.length === 0) return getMemberById(id);

  values.push(id);
  const result = await db.query(
    `UPDATE members SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

// 상태 전환 허용 맵
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:            ['active'],
  active:             ['suspended', 'pending_withdrawal', 'ended'],
  suspended:          ['active', 'pending_withdrawal', 'ended'],
  pending_withdrawal: ['active', 'withdrawn'],
  ended:              ['pending_withdrawal', 'withdrawn'],
  withdrawn:          [],
};

export async function changeMemberStatus(id: string, newStatus: string) {
  const member = await getMemberById(id);
  if (!member) throw new Error('Member not found');

  const allowed = STATUS_TRANSITIONS[member.member_status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from '${member.member_status}' to '${newStatus}'`);
  }

  // 탈퇴 신청/처리 시 태블릿 미반납 차단
  if ((newStatus === 'pending_withdrawal' || newStatus === 'withdrawn') && member.current_tablet_id) {
    throw new Error('태블릿을 먼저 반납해야 탈퇴 처리할 수 있습니다.');
  }

  const updates: string[] = [`member_status = $1::member_status`];
  const values: unknown[] = [newStatus];

  // 활성화 시 가입일 설정
  if (newStatus === 'active' && !member.joined_at) {
    updates.push(`joined_at = CURRENT_DATE`);
    updates.push(`payment_start_date = CURRENT_DATE`);
  }

  // 탈퇴 완료 시 개인정보 마스킹
  if (newStatus === 'withdrawn') {
    updates.push(`name = '탈퇴회원'`);
    updates.push(`phone = NULL`);
    updates.push(`email = $${values.length + 1}`);
    values.push(`withdrawn_${member.member_number as string}@deleted.local`);

    // Supabase 계정 비활성화
    if (member.auth_uid && supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(member.auth_uid as string, {
          ban_duration: '876000h' // 약 100년 (영구 차단과 유사)
        });
      } catch { /* ignore */ }
    }
  }

  const result = await db.query(
    `UPDATE members SET ${updates.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0];
}

// 유형 변경 - 트랜잭션으로 members + member_type_history 동시 처리 (핵심)
export async function changeMemberType(
  id: string,
  newType: 'managed' | 'subscription',
  changeReason: string,
  processedBy?: string,
  priceDiffKrw?: number
) {
  const member = await getMemberById(id);
  if (!member) throw new Error('Member not found');
  if (member.member_type === newType) throw new Error('Already this type');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE members SET member_type = $1::member_type WHERE id = $2 RETURNING *`,
      [newType, id]
    );

    await client.query(
      `INSERT INTO member_type_history
         (member_id, previous_type, new_type, change_reason, processed_by, price_diff_krw)
       VALUES ($1, $2::member_type, $3::member_type, $4, $5, $6)`,
      [id, member.member_type, newType, changeReason, processedBy ?? null, priceDiffKrw ?? null]
    );

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMemberTypeHistory(memberId: string) {
  const result = await db.query(
    `SELECT * FROM member_type_history
     WHERE member_id = $1
     ORDER BY changed_at DESC`,
    [memberId]
  );
  return result.rows;
}

export async function deleteMember(id: string) {
  // 소프트 삭제: 탈퇴 처리
  const result = await db.query(
    `UPDATE members SET member_status = 'withdrawn'::member_status WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] ?? null;
}
