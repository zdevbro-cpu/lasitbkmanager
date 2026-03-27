import path from 'path';
import { db } from '../../db';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'fs';

const LOGO_PATH = path.join(process.cwd(), 'src/assets/lasbook-logo.png');

// users.id가 정수일 수 있으므로 UUID 형식 아니면 null 처리
function uuidOrNull(s?: string | null): string | null {
  if (!s) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

// 초성 → 한글 유니코드 범위 (가=U+AC00, 초성 하나당 588자)
const CHOSUNG_RANGES: Record<string, [number, number]> = {
  'ㄱ': [0xAC00, 0xAE3B], 'ㄲ': [0xAE3C, 0xB057], 'ㄴ': [0xB058, 0xB273],
  'ㄷ': [0xB274, 0xB48F], 'ㄸ': [0xB490, 0xB6AB], 'ㄹ': [0xB6AC, 0xB8C7],
  'ㅁ': [0xB8C8, 0xBAE3], 'ㅂ': [0xBAE4, 0xBCFF], 'ㅃ': [0xBD00, 0xBF1B],
  'ㅅ': [0xBF1C, 0xC137], 'ㅆ': [0xC138, 0xC353], 'ㅇ': [0xC354, 0xC56F],
  'ㅈ': [0xC570, 0xC78B], 'ㅉ': [0xC78C, 0xC9A7], 'ㅊ': [0xC9A8, 0xCBC3],
  'ㅋ': [0xCBC4, 0xCDDF], 'ㅌ': [0xCDE0, 0xCFFB], 'ㅍ': [0xCFFC, 0xD217],
  'ㅎ': [0xD218, 0xD433],
};

function buildMemberNameCondition(
  memberSearch: string,
  paramIndex: number
): { sql: string; values: unknown[]; nextIndex: number } {
  const isChosung = /^[ㄱ-ㅎ]+$/.test(memberSearch);
  if (!isChosung) {
    return { sql: `m.name ILIKE $${paramIndex}`, values: [`%${memberSearch}%`], nextIndex: paramIndex + 1 };
  }
  const chars = [...memberSearch];
  const parts: string[] = [];
  const values: unknown[] = [];
  let p = paramIndex;
  for (let idx = 0; idx < chars.length; idx++) {
    const range = CHOSUNG_RANGES[chars[idx]];
    if (range) {
      parts.push(`SUBSTRING(m.name FROM ${idx + 1} FOR 1) >= $${p} AND SUBSTRING(m.name FROM ${idx + 1} FOR 1) <= $${p + 1}`);
      values.push(String.fromCodePoint(range[0]), String.fromCodePoint(range[1]));
      p += 2;
    }
  }
  return { sql: parts.length > 0 ? `(${parts.join(' AND ')})` : 'TRUE', values, nextIndex: p };
}

export interface CreateTabletData {
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
  storeId?: string;
}

// TAB-NNNNNN 형식 QR 코드 자동 생성 (최대 100만대)
async function generateQrCode(): Promise<string> {
  const result = await db.query(
    "SELECT qr_code FROM tablets WHERE qr_code SIMILAR TO 'TAB-[0-9]{6}%' ORDER BY SUBSTRING(qr_code FROM 5 FOR 6) DESC LIMIT 1"
  );
  if (result.rows.length === 0) return 'TAB-000001';
  const last = result.rows[0].qr_code as string;
  const numStr = last.substring(4, 10);
  const num = parseInt(numStr, 10) + 1;
  return `TAB-${String(num).padStart(6, '0')}`;
}

export async function listTablets(params: {
  status?: string;
  search?: string;
  memberSearch?: string;
  loanDateFrom?: string;
  loanDateTo?: string;
  storeId?: string;
  subStoreName?: string;
  page?: number;
  limit?: number;
}) {
  const { status, search, memberSearch, loanDateFrom, loanDateTo, storeId, subStoreName, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (storeId) { conditions.push(`t.store_id::text = $${i++}`); values.push(storeId); }
  if (status) { conditions.push(`t.status = $${i++}::tablet_status`); values.push(status); }
  if (search) {
    const isNumeric = /^\d+$/.test(search);
    if (isNumeric) {
      const padded = `TAB-${search.padStart(6, '0')}`;
      conditions.push(`(t.qr_code ILIKE $${i} OR t.model_name ILIKE $${i} OR t.serial_number ILIKE $${i} OR t.qr_code = $${i + 1})`);
      values.push(`%${search}%`, padded);
      i += 2;
    } else {
      conditions.push(`(t.qr_code ILIKE $${i} OR t.model_name ILIKE $${i} OR t.serial_number ILIKE $${i})`);
      values.push(`%${search}%`); i++;
    }
  }
  if (memberSearch) {
    const r = buildMemberNameCondition(memberSearch, i);
    conditions.push(r.sql);
    values.push(...r.values);
    i = r.nextIndex;
  }
  if (loanDateFrom) { conditions.push(`t.loan_start_date >= $${i++}::date`); values.push(loanDateFrom); }
  if (loanDateTo)   { conditions.push(`t.loan_start_date <= $${i++}::date`); values.push(loanDateTo); }
  if (subStoreName) {
    if (subStoreName === 'UNASSIGNED') {
      conditions.push(`t.sub_store_name IS NULL`);
    } else {
      conditions.push(`t.sub_store_name = $${i++}`);
      values.push(subStoreName);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `LEFT JOIN members m ON m.id::text = t.current_member_id::text
                 LEFT JOIN branches b ON b.id::text = t.store_id::text`;

  const countWhere = storeId ? `WHERE store_id::text = $1` : '';
  const countVals = storeId ? [storeId] : [];

  const [dataResult, countResult, statusCountsResult] = await Promise.all([
    db.query(
      `SELECT t.*, m.name AS member_name, m.member_number,
              b.code AS store_code, b.name AS store_name,
              CASE WHEN t.status = 'loaned' THEN t.loan_start_date ELSE NULL END AS loan_start_date,
              CASE WHEN t.status = 'loaned' THEN
                (SELECT tl.loan_officer_name FROM tablet_loans tl
                 WHERE tl.tablet_id::text = t.id::text AND tl.action = 'loaned'
                 ORDER BY tl.action_date DESC LIMIT 1)
              ELSE NULL END AS loan_officer_name
       FROM tablets t ${joins}
       ${where}
       ORDER BY t.qr_code ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM tablets t ${joins} ${where}`, values),
    db.query(`SELECT status, COUNT(*) FROM tablets ${countWhere} GROUP BY status`, countVals),
  ]);

  const rawCounts = statusCountsResult.rows;

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    statusCounts: {
      total: rawCounts.reduce((acc, r) => acc + parseInt(r.count), 0),
      stock: parseInt(rawCounts.find(r => r.status === 'stock')?.count || '0', 10),
      assigned: parseInt(rawCounts.find(r => r.status === 'assigned')?.count || '0', 10),
      loaned: parseInt(rawCounts.find(r => r.status === 'loaned')?.count || '0', 10),
      repair: parseInt(rawCounts.find(r => r.status === 'repair')?.count || '0', 10),
      lost: parseInt(rawCounts.find(r => r.status === 'lost')?.count || '0', 10),
    },
    page,
    limit,
  };
}

export async function getTabletById(id: string) {
  const result = await db.query(
    `SELECT t.*, m.name AS member_name, m.member_number, m.email AS member_email,
            b.code AS store_code, b.name AS store_name
     FROM tablets t
     LEFT JOIN members m ON m.id::text = t.current_member_id::text
     LEFT JOIN branches b ON b.id::text = t.store_id::text
     WHERE t.id::text = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getTabletByQr(qrCode: string) {
  // 스토어코드(LB101-)가 붙어서 들어오는 경우 처리
  // 예: LB101-TAB-000001 -> TAB-000001
  const rawQr = qrCode.includes('-TAB-') ? qrCode.substring(qrCode.indexOf('TAB-')) : qrCode;
  
  const result = await db.query(
    `SELECT t.*, m.name AS member_name, m.member_number,
            b.code AS store_code, b.name AS store_name
     FROM tablets t
     LEFT JOIN members m ON m.id::text = t.current_member_id::text
     LEFT JOIN branches b ON b.id::text = t.store_id::text
     WHERE t.qr_code = $1 OR UPPER(t.serial_number) = UPPER($2)`,
    [rawQr, qrCode]
  );
  return result.rows[0] ?? null;
}

export async function createTablet(data: CreateTabletData) {
  const qrCode = await generateQrCode();
  const result = await db.query(
    `INSERT INTO tablets (qr_code, model_name, serial_number, purchase_date, purchase_price, notes, store_id)
     VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::uuid)
     RETURNING *`,
    [qrCode, data.modelName ?? null, data.serialNumber ?? null,
     data.purchaseDate ?? null, data.purchasePrice ?? null, data.notes ?? null,
     data.storeId ?? '']
  );
  return result.rows[0];
}

export async function updateTablet(id: string, data: Partial<CreateTabletData>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const mapping: Record<string, string> = {
    modelName: 'model_name', serialNumber: 'serial_number',
    purchaseDate: 'purchase_date', purchasePrice: 'purchase_price', notes: 'notes',
    subStoreName: 'sub_store_name',
  };
  for (const [key, col] of Object.entries(mapping)) {
    if (key in data) { fields.push(`${col} = $${i++}`); values.push((data as Record<string, unknown>)[key]); }
  }
  if (fields.length === 0) return getTabletById(id);
  values.push(id);
  const result = await db.query(
    `UPDATE tablets SET ${fields.join(', ')} WHERE id::text = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

// 대여 - 3테이블 트랜잭션 (핵심)
// memberId가 null이면 담당자 직접 대여 (회원 없이 기록)
export async function loanTablet(tabletId: string, memberId: string | null, processedBy?: string, officerName?: string) {
  if (!memberId && !processedBy && !officerName) throw new Error('회원 또는 대여 담당자 정보가 필요합니다.');
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const tabletRes = await client.query(
      "SELECT status FROM tablets WHERE id::text = $1", [tabletId]
    );
    if (!tabletRes.rows[0]) throw new Error('Tablet not found');
    if (tabletRes.rows[0].status !== 'stock' && tabletRes.rows[0].status !== 'assigned') {
      throw new Error(`Tablet is not available (status: ${tabletRes.rows[0].status})`);
    }

    if (memberId) {
      const memberRes = await client.query(
        "SELECT member_status FROM members WHERE id::text = $1", [memberId]
      );
      if (!memberRes.rows[0]) throw new Error('Member not found');
      if (memberRes.rows[0].member_status !== 'active') {
        throw new Error('Member is not active');
      }
      await client.query(
        `UPDATE members SET current_tablet_id = $1 WHERE id::text = $2`,
        [tabletId, memberId]
      );
    }

    await client.query(
      `UPDATE tablets SET status = 'loaned', current_member_id = $1, loan_start_date = CURRENT_DATE
       WHERE id::text = $2`,
      [memberId ?? null, tabletId]
    );

    await client.query(
      `INSERT INTO tablet_loans (tablet_id, member_id, action, processed_by, loan_officer_name)
       VALUES ($1, $2, 'loaned', $3, $4)`,
      [tabletId, memberId, uuidOrNull(processedBy), officerName ?? null]
    );

    await client.query('COMMIT');
    return getTabletById(tabletId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 반납 - 3테이블 트랜잭션
export async function returnTablet(
  tabletId: string,
  conditionOk: boolean,
  conditionNotes?: string,
  processedBy?: string,
  returnStoreId?: string | null
) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const tabletRes = await client.query(
      "SELECT status, current_member_id FROM tablets WHERE id::text = $1", [tabletId]
    );
    if (!tabletRes.rows[0]) throw new Error('Tablet not found');
    if (tabletRes.rows[0].status !== 'loaned') {
      throw new Error('Tablet is not currently loaned');
    }

    const memberId = tabletRes.rows[0].current_member_id;

    await client.query(
      `UPDATE tablets SET 
         status = CASE WHEN COALESCE($2::uuid, store_id) IS NOT NULL THEN 'assigned'::tablet_status ELSE 'stock'::tablet_status END,
         store_id = COALESCE($2::uuid, store_id),
         current_member_id = NULL, 
         loan_start_date = NULL
       WHERE id::text = $1`,
      [tabletId, returnStoreId ?? null]
    );

    if (memberId) {
      await client.query(
        `UPDATE members SET current_tablet_id = NULL WHERE id::text = $1`,
        [memberId]
      );
    }

    await client.query(
      `INSERT INTO tablet_loans (tablet_id, member_id, action, returned_date, condition_ok, condition_notes, processed_by)
       VALUES ($1, $2, 'returned', NOW(), $3, $4, $5)`,
      [tabletId, memberId ?? null, conditionOk, conditionNotes ?? null, uuidOrNull(processedBy)]
    );

    await client.query('COMMIT');
    return getTabletById(tabletId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 분실 신고
export async function reportLost(tabletId: string, notes?: string, processedBy?: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const tabletRes = await client.query(
      "SELECT current_member_id FROM tablets WHERE id::text = $1", [tabletId]
    );
    if (!tabletRes.rows[0]) throw new Error('Tablet not found');
    const memberId = tabletRes.rows[0].current_member_id;

    await client.query(
      `UPDATE tablets SET status = 'lost' WHERE id::text = $1`, [tabletId]
    );

    await client.query(
      `INSERT INTO tablet_loans (tablet_id, member_id, action, notes, processed_by)
       VALUES ($1, $2, 'lost_reported', $3, $4)`,
      [tabletId, memberId ?? null, notes ?? null, processedBy ?? null]
    );

    await client.query('COMMIT');
    return getTabletById(tabletId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 회수 (분실 후 복구)
export async function recoverTablet(tabletId: string, processedBy?: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE tablets SET 
         status = CASE WHEN store_id IS NOT NULL THEN 'assigned'::tablet_status ELSE 'stock'::tablet_status END,
         current_member_id = NULL
       WHERE id::text = $1`, [tabletId]
    );
    await client.query(
      `INSERT INTO tablet_loans (tablet_id, action, processed_by) VALUES ($1, 'recovered', $2)`,
      [tabletId, processedBy ?? null]
    );
    await client.query('COMMIT');
    return getTabletById(tabletId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTabletHistory(tabletId: string) {
  const result = await db.query(
    `SELECT tl.*, m.name AS member_name
     FROM tablet_loans tl
     LEFT JOIN members m ON m.id = tl.member_id
     WHERE tl.tablet_id = $1
     ORDER BY tl.action_date DESC`,
    [tabletId]
  );
  return result.rows;
}

// storeCode가 있으면 QR 내용에 매장 코드 포함 (예: "LB101-TAB-000001")
export async function generateQrImage(qrCode: string, storeCode?: string | null): Promise<Buffer> {
  const qrContent = storeCode ? `${storeCode}-${qrCode}` : qrCode;
  // QR 코드는 오류 수정 레벨 H(30%)로 생성해야 로고 삽입 후에도 인식 가능
  const qrBuffer = await QRCode.toBuffer(qrContent, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'H',
  });

  // 로고를 QR 크기의 22%로 리사이즈 후 중앙 합성
  const qrSize = 300;
  const logoSize = Math.round(qrSize * 0.22); // 66px

  let logoBuffer: Buffer | null = null;
  if (fs.existsSync(LOGO_PATH)) {
    logoBuffer = await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
  }

  if (logoBuffer) {
    const top = Math.round((qrSize - logoSize) / 2);
    const left = Math.round((qrSize - logoSize) / 2);
    return sharp(qrBuffer)
      .composite([{ input: logoBuffer, top, left }])
      .png()
      .toBuffer();
  } else {
    return sharp(qrBuffer).png().toBuffer();
  }
}

export async function batchCreateTablets(items: CreateTabletData[]): Promise<object[]> {
  const results = [];
  
  // 시작 QR 번호 미리 확보 (DB 호출 1회)
  const result = await db.query(
    "SELECT qr_code FROM tablets WHERE qr_code SIMILAR TO 'TAB-[0-9]{6}%' ORDER BY SUBSTRING(qr_code FROM 5 FOR 6) DESC LIMIT 1"
  );
  let nextNum = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].qr_code as string;
    nextNum = parseInt(last.substring(4, 10), 10) + 1;
  }

  for (const item of items) {
    const qrCode = `TAB-${String(nextNum).padStart(6, '0')}`;
    
    try {
      const insertResult = await db.query(
        `INSERT INTO tablets (qr_code, model_name, serial_number, purchase_date, purchase_price, notes, store_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
         RETURNING *`,
        [qrCode, item.modelName ?? null, item.serialNumber ?? null,
         item.purchaseDate ?? null, item.purchasePrice ?? null, item.notes ?? null,
         item.storeId ?? null]
      );
      results.push(insertResult.rows[0] || {});
      nextNum++;
    } catch (err: any) {
      if (err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        throw new Error(`DB 처리 중 오류가 발생했습니다. 동일한 시리얼 번호가 이미 등록되어 있는지 확인해주세요. (시리얼: ${item.serialNumber})`);
      }
      throw err; // 기타 에러는 그대로 던짐
    }
  }
  return results;
}

export async function bulkAssignStore(ids: string[], storeId: string | null, isRelease = false) {
  if (ids.length === 0) return { updated: 0 };

  const placeholders = ids.map((_, i) => `$${i + 3}`).join(', ');

  if (isRelease) {
    // 해지: 본사로 반환, 재고 상태로
    const hqRes = await db.query(
      "SELECT id::text AS id FROM branches WHERE name = '본사' OR code = 'LA0000' ORDER BY code LIMIT 1"
    );
    const hqId = hqRes.rows[0]?.id ?? null;
    if (hqId) {
      // 본사 지점 발견 → store_id를 본사로 변경 + stock 상태
      const hqPlaceholders = ids.map((_, i) => `$${i + 2}`).join(', ');
      await db.query(
        `UPDATE tablets SET store_id = $1::uuid, status = 'stock'::tablet_status WHERE id::text IN (${hqPlaceholders})`,
        [hqId, ...ids]
      );
    } else {
      // 본사 미발견 → store_id는 그대로 유지, status만 stock으로 변경
      const statusPlaceholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      await db.query(
        `UPDATE tablets SET status = 'stock'::tablet_status WHERE id::text IN (${statusPlaceholders})`,
        [...ids]
      );
    }
    return { updated: ids.length };
  }

  const status = storeId ? 'assigned' : 'stock';
  await db.query(
    `UPDATE tablets SET store_id = NULLIF($1, '')::uuid, status = $2::tablet_status WHERE id::text IN (${placeholders})`,
    [storeId ?? '', status, ...ids]
  );
  return { updated: ids.length };
}

export async function bulkAssignSubStore(ids: string[], subStoreName: string | null) {
  if (ids.length === 0) return { updated: 0 };
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await db.query(
    `UPDATE tablets SET sub_store_name = $1, status = 'assigned'::tablet_status WHERE id::text IN (${placeholders})`,
    [subStoreName, ...ids]
  );
  return { updated: ids.length };
}

export async function deleteTablet(id: string) {
  const tablet = await getTabletById(id);
  if (!tablet) throw new Error('Tablet not found');
  if (tablet.status === 'loaned') throw new Error('대여 중인 태블릿은 삭제할 수 없습니다');
  await db.query('DELETE FROM tablets WHERE id::text = $1', [id]);
  return true;
}

export async function regenQrCode(id: string) {
  await getTabletById(id);
  const newQrCode = await generateQrCode();
  const result = await db.query(
    'UPDATE tablets SET qr_code = $1 WHERE id::text = $2 RETURNING *',
    [newQrCode, id]
  );
  if (!result.rows[0]) throw new Error('Tablet not found');
  return result.rows[0];
}
