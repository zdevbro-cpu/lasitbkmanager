import { Request, Response, NextFunction } from 'express';
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

// 인증 캐시: sub → AuthUser (5분 TTL)
// HTTP 기반 DB 쿼리의 레이턴시를 줄이기 위해 사용
const AUTH_CACHE = new Map<string, { user: AuthUser; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// las-mgmt user_type → itbookmanager role 매핑
function mapUserTypeToRole(userType: string): 'system_admin' | 'store_manager' | 'young_creator' {
  if (userType === '시스템관리자') return 'system_admin';
  return 'store_manager';
}

// JWT 페이로드 로컬 디코딩 (네트워크 호출 없음)
function decodeJwt(token: string): { sub: string; email?: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub || !payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function invalidateAuthCache(userId: string) {
  AUTH_CACHE.delete(userId);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.slice(7);
  const payload = decodeJwt(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.exp * 1000 < Date.now()) {
    AUTH_CACHE.delete(payload.sub);
    return res.status(401).json({ error: 'Token expired' });
  }

  const userId = payload.sub;
  const userEmail = payload.email;

  // 캐시 히트: DB 쿼리 생략
  const cached = AUTH_CACHE.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  try {
    // las-mgmt users 테이블에서 역할 및 지점 정보 확인 (Single Query)
    const adminResult = await db.query(
      `SELECT u.id, u.user_type, u.branch, b.id as store_id, b.code as store_code
       FROM users u
       LEFT JOIN branches b ON b.name = u.branch
       WHERE u.auth_uid = $1 AND u.status = 'approved'
       LIMIT 1`,
      [userId]
    );

    if (adminResult.rows.length > 0) {
      const u = adminResult.rows[0];
      const user: AuthUser = {
        uid: userId,
        email: userEmail,
        role: mapUserTypeToRole(u.user_type),
        adminId: u.id,
        storeId: u.store_id ?? null,
        storeCode: u.store_code ?? null,
      };
      AUTH_CACHE.set(userId, { user, expiresAt: Date.now() + CACHE_TTL });
      req.user = user;
      return next();
    }

    // members 테이블에서 확인
    try {
      const memberResult = await db.query(
        "SELECT id FROM members WHERE email = $1 AND member_status != 'withdrawn'",
        [userEmail]
      );
      if (memberResult.rows.length > 0) {
        const user: AuthUser = {
          uid: userId,
          email: userEmail,
          role: 'member',
          memberId: memberResult.rows[0].id,
        };
        AUTH_CACHE.set(userId, { user, expiresAt: Date.now() + CACHE_TTL });
        req.user = user;
        return next();
      }
    } catch {
      // members 테이블 없으면 무시
    }

    return res.status(403).json({ error: 'User not registered' });
  } catch (err) {
    console.error('Authentication Error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}
