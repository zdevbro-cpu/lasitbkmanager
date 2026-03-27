import { db } from '../../db';

// 특정 회원에게 특정 주차 패키지 배포
export async function distributeToMember(memberId: string, weekNumber: number) {
  const pkg = await db.query(
    'SELECT id FROM content_packages WHERE week_number = $1 AND is_published = true',
    [weekNumber]
  );
  if (!pkg.rows[0]) throw new Error(`Package for week ${weekNumber} not found or not published`);
  const packageId = pkg.rows[0].id as string;

  await db.query(
    `INSERT INTO member_content_access (member_id, package_id, week_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (member_id, package_id) DO NOTHING`,
    [memberId, packageId, weekNumber]
  );
  return { memberId, packageId, weekNumber };
}

// 특정 회원에게 여러 주차 일괄 배포 (가입 시 초기화용)
export async function distributeHistorical(memberId: string, fromWeek: number, toWeek: number) {
  const packages = await db.query(
    'SELECT id, week_number FROM content_packages WHERE week_number BETWEEN $1 AND $2 AND is_published = true ORDER BY week_number',
    [fromWeek, toWeek]
  );
  if (!packages.rows.length) return { distributed: 0 };

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const pkg of packages.rows) {
      await client.query(
        `INSERT INTO member_content_access (member_id, package_id, week_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (member_id, package_id) DO NOTHING`,
        [memberId, pkg.id, pkg.week_number]
      );
    }
    await client.query('COMMIT');
    return { distributed: packages.rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 모든 활성 회원에게 현재 주차 패키지 배포 (Cloud Scheduler 호출)
export async function distributeCurrentWeekToAll(weekNumber: number) {
  const pkg = await db.query(
    'SELECT id FROM content_packages WHERE week_number = $1 AND is_published = true',
    [weekNumber]
  );
  if (!pkg.rows[0]) throw new Error(`Week ${weekNumber} package not found`);
  const packageId = pkg.rows[0].id as string;

  const members = await db.query(
    "SELECT id FROM members WHERE member_status = 'active'"
  );

  let distributed = 0;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const m of members.rows) {
      const result = await client.query(
        `INSERT INTO member_content_access (member_id, package_id, week_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (member_id, package_id) DO NOTHING
         RETURNING id`,
        [m.id, packageId, weekNumber]
      );
      if (result.rows.length > 0) distributed++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { weekNumber, packageId, distributed, total: members.rows.length };
}

// 회원이 접근 가능한 패키지 목록 조회
export async function getMemberAccess(memberId: string) {
  const result = await db.query(
    `SELECT mca.*, cp.title, cp.week_number, cp.book_count,
            COALESCE(
              ROUND(
                100.0 * SUM(CASE WHEN mcp.is_completed THEN 1 ELSE 0 END)
                / NULLIF(cp.book_count, 0)
              ), 0
            ) AS completion_pct
     FROM member_content_access mca
     JOIN content_packages cp ON cp.id = mca.package_id
     LEFT JOIN content_items ci ON ci.package_id = cp.id AND ci.is_active = true
     LEFT JOIN member_content_progress mcp ON mcp.content_item_id = ci.id AND mcp.member_id = mca.member_id
     WHERE mca.member_id = $1
       AND (mca.expires_at IS NULL OR mca.expires_at > NOW())
     GROUP BY mca.id, cp.title, cp.week_number, cp.book_count
     ORDER BY cp.week_number DESC`,
    [memberId]
  );
  return result.rows;
}
