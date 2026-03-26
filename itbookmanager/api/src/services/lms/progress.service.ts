import { db } from '../../db';

// 진도 업데이트 (upsert - 30초마다 클라이언트에서 호출)
export async function updateProgress(data: {
  memberId: string;
  contentItemId: string;
  progressPct: number;
  timeSpentSec?: number;
}) {
  const result = await db.query(
    `INSERT INTO member_content_progress
       (member_id, content_item_id, package_id, started_at, last_accessed_at, progress_pct, time_spent_sec)
     SELECT $1, $2, ci.package_id, NOW(), NOW(), $3, $4
     FROM content_items ci WHERE ci.id = $2
     ON CONFLICT (member_id, content_item_id) DO UPDATE SET
       last_accessed_at = NOW(),
       progress_pct = GREATEST(member_content_progress.progress_pct, EXCLUDED.progress_pct),
       time_spent_sec = member_content_progress.time_spent_sec + $4,
       started_at = COALESCE(member_content_progress.started_at, NOW())
     RETURNING *`,
    [data.memberId, data.contentItemId, data.progressPct, data.timeSpentSec ?? 0]
  );
  return result.rows[0];
}

// 콘텐츠 완료 처리
export async function markCompleted(memberId: string, contentItemId: string) {
  const result = await db.query(
    `INSERT INTO member_content_progress
       (member_id, content_item_id, package_id, started_at, last_accessed_at, completed_at, progress_pct, is_completed)
     SELECT $1, $2, ci.package_id, NOW(), NOW(), NOW(), 100, true
     FROM content_items ci WHERE ci.id = $2
     ON CONFLICT (member_id, content_item_id) DO UPDATE SET
       completed_at = NOW(),
       last_accessed_at = NOW(),
       progress_pct = 100,
       is_completed = true
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
            COALESCE(SUM(mcp.time_spent_sec), 0) AS total_time_sec,
            ROUND(100.0 * COUNT(mcp.id) FILTER (WHERE mcp.is_completed)
                  / NULLIF(COUNT(ci.id), 0)) AS completion_pct
     FROM member_content_access mca
     JOIN content_packages cp ON cp.id = mca.package_id
     LEFT JOIN content_items ci ON ci.package_id = cp.id AND ci.is_active = true
     LEFT JOIN member_content_progress mcp ON mcp.content_item_id = ci.id AND mcp.member_id = $1
     WHERE mca.member_id = $1
     GROUP BY cp.id, cp.week_number, cp.title, cp.book_count
     ORDER BY cp.week_number DESC`,
    [memberId]
  );

  const summary = await db.query(
    `SELECT
       COUNT(DISTINCT mca.package_id) AS total_packages,
       COUNT(mcp.id) FILTER (WHERE mcp.is_completed) AS total_completed,
       COALESCE(SUM(mcp.time_spent_sec), 0) AS total_time_sec
     FROM member_content_access mca
     LEFT JOIN content_items ci ON ci.package_id = mca.package_id AND ci.is_active = true
     LEFT JOIN member_content_progress mcp ON mcp.content_item_id = ci.id AND mcp.member_id = $1
     WHERE mca.member_id = $1`,
    [memberId]
  );

  return { summary: summary.rows[0], packages: packages.rows };
}

// 관리자용 전체 회원 진도 현황
export async function getBulkReport() {
  const result = await db.query(
    `SELECT m.id, m.name, m.member_number, m.member_type, m.current_week,
            COUNT(DISTINCT mca.package_id) AS access_packages,
            COUNT(mcp.id) FILTER (WHERE mcp.is_completed) AS completed_items,
            COALESCE(SUM(mcp.time_spent_sec), 0) AS total_time_sec
     FROM members m
     LEFT JOIN member_content_access mca ON mca.member_id = m.id
     LEFT JOIN content_items ci ON ci.package_id = mca.package_id AND ci.is_active = true
     LEFT JOIN member_content_progress mcp ON mcp.content_item_id = ci.id AND mcp.member_id = m.id
     WHERE m.member_status = 'active'
     GROUP BY m.id
     ORDER BY m.member_number`
  );
  return result.rows;
}
