import { db } from '../../db';

// las-mgmt education_sessions: id, title, session_date, enrollment_deadline,
//   max_capacity, current_enrollment, is_active, created_at, updated_at

export async function listSessions(params: { fromDate?: string; toDate?: string; isActive?: boolean }) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.fromDate) { conditions.push(`session_date >= $${i++}`); values.push(params.fromDate); }
  if (params.toDate)   { conditions.push(`session_date <= $${i++}`); values.push(params.toDate); }
  if (params.isActive !== undefined) { conditions.push(`is_active = $${i++}`); values.push(params.isActive); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT * FROM education_sessions ${where} ORDER BY session_date DESC`,
    values
  );
  return result.rows;
}

export async function createSession(data: {
  title: string;
  sessionDate: string;
  enrollmentDeadline?: string;
  maxCapacity?: number;
  isActive?: boolean;
}) {
  const result = await db.query(
    `INSERT INTO education_sessions (title, session_date, enrollment_deadline, max_capacity, is_active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      data.title, data.sessionDate, data.enrollmentDeadline ?? null,
      data.maxCapacity ?? null, data.isActive ?? true,
    ]
  );
  return result.rows[0];
}

export async function updateSession(id: string, data: {
  title?: string; sessionDate?: string; enrollmentDeadline?: string;
  maxCapacity?: number; isActive?: boolean;
}) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    title: 'title', sessionDate: 'session_date', enrollmentDeadline: 'enrollment_deadline',
    maxCapacity: 'max_capacity', isActive: 'is_active',
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in data) { fields.push(`${col} = $${i++}`); values.push((data as Record<string, unknown>)[k]); }
  }
  if (!fields.length) throw new Error('No fields to update');
  values.push(id);
  const result = await db.query(
    `UPDATE education_sessions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(id: string) {
  await db.query('DELETE FROM education_sessions WHERE id = $1', [id]);
}
