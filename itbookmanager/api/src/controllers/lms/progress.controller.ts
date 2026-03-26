import type { Request, Response, NextFunction } from 'express';
import * as progressService from '../../services/lms/progress.service';

export async function updateProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = req.user?.memberId;
    if (!memberId) return res.status(401).json({ message: 'Unauthorized' });
    const { contentItemId, progressPct, timeSpentSec } = req.body as {
      contentItemId: string; progressPct: number; timeSpentSec?: number;
    };
    const result = await progressService.updateProgress({ memberId, contentItemId, progressPct, timeSpentSec });
    res.json(result);
  } catch (e) { next(e); }
}

export async function markCompleted(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = req.user?.memberId;
    if (!memberId) return res.status(401).json({ message: 'Unauthorized' });
    const result = await progressService.markCompleted(memberId, req.params.itemId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function getMemberReport(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = req.params.memberId;
    const result = await progressService.getMemberReport(memberId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function getBulkReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await progressService.getBulkReport();
    res.json(result);
  } catch (e) { next(e); }
}
