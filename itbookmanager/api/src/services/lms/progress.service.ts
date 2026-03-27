import { db } from '../../db';

// member_content_progress: id, member_id, content_item_id, last_accessed,
//   completion_percentage, is_completed, created_at, updated_at

export async function updateProgress(data: {
  memberId: string;
  contentItemId: string;
  progressPct: number;
  timeSpentSec?: number; // 호환성 유지 (무시됨)
}) {
  const result = await db.query(
    `INSERT INTO member_content_progress (member_id, content_item_id, completion_percentage, last_accessed)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (member_id, content_item_id) DO UPDATE SET
       completion_percentage = GREATEST(member_content_progress.completion_percentage, EXCLUDED.completion_percentage),
       last_accessed = NOW()
     RETURNING *`,
    [data.memberId, data.contentItemId, data.progressPct]
  );
  return result.rows[0];
}

export async function markCompleted(memberId: string, contentItemId: string) {
  const result = await db.query(
    `INSERT INTO member_content_progress (member_id, content_item_id, completion_percentage, is_completed, last_accessed)
     VALUES ($1, $2, 100, true, NOW())
     ON CONFLICT (member_id, content_item_id) DO UPDATE SET
       completion_percentage = 100,
       is_completed = true,
       last_accessed = NOW()
     RETURNING *`,
    [memberId, contentItemId]
  );
  return result.rows[0];
}

// 회원 전체 학습 리포트
export async function getMemberReport(memberId: string) {
  const packages = await db.query(
    `SELECT cp.id, cp.week_number, cp.title, cp.book_count,
            COUNT(ci.id) AS total_items,
            COUNT(mcp.id) FILTER (WHERE mcp.is_completed) AS completed_items,
            ROUND(100.0 * COUNT(mcp.id) FILTER (WHERE mcp.is_completed)
                  / NULLIF(COUNT(ci.id), 0)) AS completion_pct
     FROM content_packages cp
     LEFT JOIN content_items ci ON ci.package_id = cp.id AND ci.is_active = true
     LEFT JOIN member_content_progress mcp ON mcp.content_item_id = ci.id AND mcp.member_id = $1
     WHERE cp.is_published = true
     GROUP BY cp.id, cp.week_number, cp.title, cp.book_count
     ORDER BY cp.week_number DESC`,
    [memberId]
  );

  const summary = await db.query(
    `SELECT
       COUNT(DISTINCT ci.package_id) AS total_packages,
       COUNT(mcp.id) FILTER (WHERE mcp.is_completed) AS total_completed
     FROM member_content_progress mcp
     JOIN content_items ci ON ci.id = mcp.content_item_id
     WHERE mcp.member_id = $1`,
    [memberId]
  );

  return { summary: summary.rows[0], packages: packages.rows };
}

// 관리자용 전체 회원 진도 현황
export async function getBulkReport() {
  const result = await db.query(
    `SELECT m.id, m.name, m.member_number, m.member_type,
            COUNT(DISTINCT ci.package_id) FILTER (WHERE mcp.id IS NOT NULL) AS access_packages,
            COUNT(mcp.id) FILTER (WHERE mcp.is_completed) AS completed_items
     FROM members m
     LEFT JOIN member_content_progress mcp ON mcp.member_id = m.id
     LEFT JOIN content_items ci ON ci.id = mcp.content_item_id AND ci.is_active = true
     WHERE m.member_status = 'active'
     GROUP BY m.id
     ORDER BY m.member_number`
  );
  return result.rows;
}
