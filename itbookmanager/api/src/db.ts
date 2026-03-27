import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryResult = { rows: any[]; rowCount: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSql(sql: string, params?: unknown[]): Promise<QueryResult> {
  const textParams = (params ?? []).map(p => {
    if (p === null || p === undefined) return null;
    if (typeof p === 'boolean') return p ? 'true' : 'false';
    return String(p);
  });

  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: sql,
    params: textParams,
  });

  if (error) {
    console.error('[DB Error]', error.message, '\nSQL:', sql.slice(0, 300));
    throw new Error(error.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = Array.isArray(data) ? data : [];
  return { rows, rowCount: rows.length };
}

// 트랜잭션 마커(BEGIN/COMMIT/ROLLBACK)는 no-op 처리
class FakeClient {
  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    const t = sql.trim().toUpperCase();
    if (t === 'BEGIN' || t === 'COMMIT' || t === 'ROLLBACK') return { rows: [], rowCount: 0 };
    return runSql(sql, params);
  }
  release() {}
}

export const db = {
  query: runSql,
  connect: async () => new FakeClient(),
};

export async function testConnection(): Promise<void> {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) throw new Error(error.message);
}
