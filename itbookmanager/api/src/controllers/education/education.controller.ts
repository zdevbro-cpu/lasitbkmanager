import type { Request, Response, NextFunction } from 'express';
import * as educationService from '../../services/education/education.service';

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { fromDate, toDate, isActive } = req.query as Record<string, string | undefined>;
    const result = await educationService.listSessions({
      fromDate,
      toDate,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, sessionDate, enrollmentDeadline, maxCapacity, isActive } = req.body as {
      title: string; sessionDate: string; enrollmentDeadline?: string;
      maxCapacity?: number; isActive?: boolean;
    };
    const result = await educationService.createSession({
      title, sessionDate, enrollmentDeadline, maxCapacity, isActive,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function updateSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await educationService.updateSession(req.params.id, req.body as {
      title?: string; sessionDate?: string; enrollmentDeadline?: string;
      maxCapacity?: number; isActive?: boolean;
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
