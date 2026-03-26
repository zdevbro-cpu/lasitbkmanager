import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === 'member') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'system_admin') {
    return res.status(403).json({ error: 'System admin access required' });
  }
  next();
}

// 하위호환 alias
export const requireSuperAdmin = requireSystemAdmin;

export function requireMember(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
