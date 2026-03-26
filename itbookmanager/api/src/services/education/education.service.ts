import { db } from '../../db';

export async function listSessions(params: { memberId?: string; fromDate?: string; toDate?: string }) {
  const conditions: string[] = ["m.member_type = 'managed'"];
  const values: unknown[] = [];
  let i = 1;

  if (params.memberId) { conditions.push(`es.member_id = $${i++}`); values.push(params.memberId); }
  if (params.fromDate) { conditions.push(`es.session_date >= $${i++}`); values.push(params.fromDate); }
  if (params.toDate) { conditions.push(`es.session_date <= $${i++}`); values.push(params.toDate); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await db.query(
    `SELECT es.*, m.name AS member_name, m.member_number
     FROM education_sessions es
     JOIN members m ON m.id = es.member_id
     ${where}
     ORDER BY es.session_date DESC`,
    values
  );
  return result.rows;
}

export async function createSession(data: {
  memberId: string;
  sessionDate: string;
  instructor?: string;
  attended?: boolean;
  rating?: number;
  notes?: string;
  createdBy?: string;
}) {
  const result = await db.query(
    `INSERT INTO education_sessions
       (member_id, session_date, instructor, attended, rating, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.memberId, data.sessionDate, data.instructor ?? null,
      data.attended ?? true, data.rating ?? null,
      data.notes ?? null, data.createdBy ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateSession(id: string, data: {
  attended?: boolean; rating?: number; notes?: string; instructor?: string;
}) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    attended: 'attended', rating: 'rating', notes: 'notes', instructor: 'instructor',
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
