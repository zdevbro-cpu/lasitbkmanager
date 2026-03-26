import type { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../../services/dashboard/dashboard.service';

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (e) { next(e); }
}

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await dashboardService.getRecentActivity();
    res.json(activity);
  } catch (e) { next(e); }
}
