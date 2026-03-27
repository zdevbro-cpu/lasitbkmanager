import { db } from '../../db';
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

// 회원 QR 코드는 회원번호와 동일하게 사용
async function generateMemberQrCode(memberNumber: string): Promise<string> {
  return memberNumber;
}

export async function getMemberQrImage(id: string): Promise<Buffer | null> {
  const result = await db.query('SELECT qr_code FROM members WHERE id::text = $1', [id]);
  const code = result.rows[0]?.qr_code as string | undefined;
  if (!code) return null;
  return generateQrImage(code);
}

export async function getMemberByQrCode(code: string) {
  const result = await db.query(
    `SELECT m.*, t.qr_code AS tablet_qr_code, t.model_name AS tablet_model
     FROM members m
     LEFT JOIN tablets t ON t.id = m.current_tablet_id
     WHERE m.qr_code = $1 OR m.member_number = $1`,
    [code.toUpperCase()]
  );
  return result.rows[0] ?? null;
}

// LITB-NNNNN 형식 회원번호 생성 (전체 순번)
async function generateMemberNumber(): Promise<string> {
  const result = await db.query("SELECT COUNT(*) FROM members");
  const seq = parseInt(result.rows[0].count) + 1;
  return `LITB-${String(seq).padStart(5, '0')}`;
}

export async function getStatusCounts(storeId?: string): Promise<Record<string, number>> {
  const where = storeId ? 'WHERE store_id::text = $1' : '';
  const result = await db.query(
    `SELECT member_status, COUNT(*) as count FROM members ${where} GROUP BY member_status`,
    storeId ? [storeId] : []
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.member_status as string] = parseInt(row.count as string);
  }
  return counts;
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

  if (storeId) { conditions.push(`m.store_id::text = $${i++}`); values.push(storeId); }
  if (type) { conditions.push(`m.member_type = $${i++}::member_type`); values.push(type); }
  if (status) { conditions.push(`m.member_status = $${i++}::member_status`); values.push(status); }
  else if (excludeWithdrawn) { conditions.push(`m.member_status != 'withdrawn'::member_status`); }
  if (search) {
    conditions.push(`(m.name ILIKE $${i} OR m.email ILIKE $${i} OR m.member_number ILIKE $${i} OR m.phone ILIKE $${i})`);
    values.push(`%${search}%`); i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataResult = await db.query(
    `SELECT m.id, m.member_number, m.qr_code AS member_qr_code, m.name, m.phone, m.email,
            m.member_type, m.member_status, m.joined_at,
            m.current_tablet_id, m.assigned_instructor, m.created_at,
            m.payment_plan_name, m.plan_amount, m.plan_discounted_amt, m.payment_method, m.notes,
            b.code AS store_code, b.name AS store_name,
            COUNT(*) OVER() AS total_count
     FROM members m
     LEFT JOIN branches b ON b.id::text = m.store_id::text
     ${where}
     ORDER BY m.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  const total = dataResult.rows[0]?.total_count ? parseInt(dataResult.rows[0].total_count) : 0;

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
  };
}

export async function getMemberById(id: string) {
  const result = await db.query(
    `SELECT m.*, m.qr_code AS member_qr_code,
            t.qr_code AS tablet_qr_code, t.model_name AS tablet_model,
            b.code AS store_code, b.name AS store_name
     FROM members m
     LEFT JOIN tablets t ON t.id = m.current_tablet_id
     LEFT JOIN branches b ON b.id::text = m.store_id::text
     WHERE m.id::text = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createMember(data: CreateMemberData) {
  const memberNumber = await generateMemberNumber();
  const memberQrCode = await generateMemberQrCode(memberNumber);
  const now = new Date().toISOString();

  const result = await db.query(
    `INSERT INTO members (
       member_number, qr_code, name, phone, email,
       member_type, assigned_instructor, store_id,
       payment_plan_name, plan_amount, plan_discounted_amt, payment_method, 
       joined_at, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      memberNumber, memberQrCode, data.name, data.phone ?? null, data.email,
      data.memberType, data.assignedInstructor ?? null, data.storeId ?? null,
      data.paymentPlanName ?? null, data.planAmount ?? 0, data.planDiscountedAmt ?? 0, data.paymentMethod ?? null,
      now, data.notes ?? null
    ]
  );
  return result.rows[0];
}

export async function updateMember(id: string, data: UpdateMemberData) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const mapping: Record<string, string> = {
    name: 'name', phone: 'phone', assignedInstructor: 'assigned_instructor',
    paymentPlanName: 'payment_plan_name', planAmount: 'plan_amount',
    planDiscountedAmt: 'plan_discounted_amt', paymentMethod: 'payment_method',
    notes: 'notes'
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
    `UPDATE members SET ${fields.join(', ')} WHERE id::text = $${i} RETURNING *`,
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
  }

  // 탈퇴 완료 시 개인정보 마스킹
  if (newStatus === 'withdrawn') {
    updates.push(`name = '탈퇴회원'`);
    updates.push(`phone = NULL`);
    updates.push(`email = $${values.length + 1}`);
    values.push(`withdrawn_${member.member_number as string}@deleted.local`);
  }

  const result = await db.query(
    `UPDATE members SET ${updates.join(', ')} WHERE id::text = $${values.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0];
}

// 유형 변경
export async function changeMemberType(
  id: string,
  newType: 'managed' | 'subscription',
  _changeReason: string,
  _processedBy?: string,
  _priceDiffKrw?: number
) {
  const member = await getMemberById(id);
  if (!member) throw new Error('Member not found');
  if (member.member_type === newType) throw new Error('Already this type');

  const result = await db.query(
    `UPDATE members SET member_type = $1::member_type WHERE id::text = $2 RETURNING *`,
    [newType, id]
  );
  return result.rows[0];
}

export async function getMemberTypeHistory(_memberId: string) {
  return []; // member_type_history 테이블 없음
}

export async function deleteMember(id: string) {
  // 소프트 삭제: 탈퇴 처리
  const result = await db.query(
    `UPDATE members SET member_status = 'withdrawn'::member_status WHERE id::text = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function isEmailDuplicate(email: string): Promise<boolean> {
  const result = await db.query(
    "SELECT id FROM members WHERE email = $1",
    [email]
  );
  return result.rows.length > 0;
}
