import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import { db } from '../db';

export interface AuthUser {
  uid: string;
  email?: string;
  role: 'system_admin' | 'store_manager' | 'young_creator' | 'member';
  adminId?: string;
  memberId?: string;
  storeId?: string | null;
  storeCode?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // users 테이블에서 역할 확인
    const adminResult = await db.query(
      `SELECT a.id, a.role, a.branch_id AS store_id, b.code AS store_code
       FROM users a
       LEFT JOIN branches b ON b.id = a.branch_id
       WHERE a.auth_uid = $1 AND a.is_active = true`,
      [supabaseUser.id]
    );

    if (adminResult.rows.length > 0) {
      const adminUser = adminResult.rows[0];
      req.user = {
        uid: supabaseUser.id,
        email: supabaseUser.email,
        role: adminUser.role,
        adminId: adminUser.id,
        storeId: adminUser.store_id ?? null,
        storeCode: adminUser.store_code ?? null,
      };
      return next();
    }

    // members 테이블에서 확인
    const memberResult = await db.query(
      "SELECT id FROM members WHERE auth_uid = $1 AND member_status != 'withdrawn'",
      [supabaseUser.id]
    );

    if (memberResult.rows.length > 0) {
      req.user = {
        uid: supabaseUser.id,
        email: supabaseUser.email,
        role: 'member',
        memberId: memberResult.rows[0].id,
      };
      return next();
    }

    return res.status(403).json({ error: 'User not registered' });
  } catch (err) {
    console.error('Authentication Error:', err);
    return res.status(401).json({ error: 'Authentication error' });
  }
}
