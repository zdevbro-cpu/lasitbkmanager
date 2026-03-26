import type { Request, Response, NextFunction } from 'express';
import * as educationService from '../../services/education/education.service';

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberId, fromDate, toDate } = req.query as Record<string, string | undefined>;
    const result = await educationService.listSessions({ memberId, fromDate, toDate });
    res.json(result);
  } catch (e) { next(e); }
}

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberId, sessionDate, instructor, attended, rating, notes } = req.body as {
      memberId: string; sessionDate: string; instructor?: string;
      attended?: boolean; rating?: number; notes?: string;
    };
    const result = await educationService.createSession({
      memberId, sessionDate, instructor, attended, rating, notes,
      createdBy: req.user?.adminId,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function updateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await educationService.updateSession(req.params.id, req.body as {
      attended?: boolean; rating?: number; notes?: string; instructor?: string;
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function deleteSession(req: Request, res: Response, next: NextFunction) {
  try {
    await educationService.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
}
