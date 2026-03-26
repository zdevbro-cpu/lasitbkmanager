import { db } from '../../db';
import { getUploadSignedUrl, getDownloadSignedUrl, buildStoragePath } from '../../storage/supabase.storage';

// ─── 콘텐츠 패키지 ───────────────────────────────────────────────

export async function listPackages(params: { published?: boolean; page?: number; limit?: number }) {
  const { published, page = 1, limit = 30 } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (published !== undefined) { conditions.push(`is_published = $${i++}`); values.push(published); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [data, count] = await Promise.all([
    db.query(
      `SELECT * FROM content_packages ${where} ORDER BY week_number ASC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM content_packages ${where}`, values),
  ]);
  return { data: data.rows, total: parseInt(count.rows[0].count), page, limit };
}

export async function getPackageById(id: string) {
  const pkg = await db.query('SELECT * FROM content_packages WHERE id = $1', [id]);
  if (!pkg.rows[0]) return null;
  const items = await db.query(
    'SELECT * FROM content_items WHERE package_id = $1 AND is_active = true ORDER BY sort_order ASC',
    [id]
  );
  return { ...pkg.rows[0], items: items.rows };
}

export async function createPackage(data: { weekNumber: number; title: string; description?: string }, createdBy?: string) {
  const result = await db.query(
    `INSERT INTO content_packages (week_number, title, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.weekNumber, data.title, data.description ?? null, createdBy ?? null]
  );
  return result.rows[0];
}

export async function updatePackage(id: string, data: { title?: string; description?: string }) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.title) { fields.push(`title = $${i++}`); values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description); }
  if (!fields.length) return getPackageById(id);
  values.push(id);
  await db.query(`UPDATE content_packages SET ${fields.join(', ')} WHERE id = $${i}`, values);
  return getPackageById(id);
}

export async function publishPackage(id: string) {
  const result = await db.query(
    `UPDATE content_packages SET is_published = true, published_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deletePackage(id: string) {
  // 게시 전만 삭제 가능
  const result = await db.query(
    `DELETE FROM content_packages WHERE id = $1 AND is_published = false RETURNING id`,
    [id]
  );
  if (!result.rows[0]) throw new Error('Cannot delete published package');
  return true;
}

// ─── 콘텐츠 아이템 ───────────────────────────────────────────────

export async function addContentItem(data: {
  packageId: string;
  title: string;
  author?: string;
  contentType: string;
  sortOrder?: number;
}) {
  const result = await db.query(
    `INSERT INTO content_items (package_id, title, author, content_type, sort_order)
     VALUES ($1, $2, $3, $4::content_type, $5) RETURNING *`,
    [data.packageId, data.title, data.author ?? null, data.contentType, data.sortOrder ?? 0]
  );
  // 패키지 book_count 업데이트
  await db.query(
    `UPDATE content_packages SET book_count = (
       SELECT COUNT(*) FROM content_items WHERE package_id = $1 AND is_active = true
     ) WHERE id = $1`,
    [data.packageId]
  );
  return result.rows[0];
}

export async function updateContentItem(id: string, data: {
  title?: string; author?: string; storagePath?: string;
  fileSizeBytes?: number; durationSec?: number; sortOrder?: number;
}) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    title: 'title', author: 'author', storagePath: 'storage_path',
    fileSizeBytes: 'file_size_bytes', durationSec: 'duration_sec', sortOrder: 'sort_order',
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in data) { fields.push(`${col} = $${i++}`); values.push((data as Record<string, unknown>)[k]); }
  }
  if (!fields.length) return null;
  values.push(id);
  const result = await db.query(
    `UPDATE content_items SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values
  );
  return result.rows[0] ?? null;
}

export async function deleteContentItem(id: string) {
  await db.query(`UPDATE content_items SET is_active = false WHERE id = $1`, [id]);
}

// 업로드 서명 URL 발급
export async function getUploadUrl(itemId: string, filename: string, contentType: string) {
  const item = await db.query('SELECT * FROM content_items WHERE id = $1', [itemId]);
  if (!item.rows[0]) throw new Error('Item not found');
  const storagePath = buildStoragePath(item.rows[0].package_id as string, itemId, filename);
  const uploadUrl = await getUploadSignedUrl(storagePath, contentType);
  return { uploadUrl, storagePath };
}

// 다운로드 서명 URL 발급 (회원 접근 권한 확인 포함)
export async function getDownloadUrl(itemId: string, memberId: string) {
  // 접근 권한 확인: member_content_access
  const access = await db.query(
    `SELECT mca.id FROM member_content_access mca
     JOIN content_items ci ON ci.package_id = mca.package_id
     WHERE ci.id = $1 AND mca.member_id = $2
       AND (mca.expires_at IS NULL OR mca.expires_at > NOW())`,
    [itemId, memberId]
  );
  if (!access.rows[0]) throw new Error('Access denied');

  const item = await db.query('SELECT storage_path FROM content_items WHERE id = $1', [itemId]);
  if (!item.rows[0]?.storage_path) throw new Error('File not uploaded yet');

  const url = await getDownloadSignedUrl(item.rows[0].storage_path as string);
  return url;
}
