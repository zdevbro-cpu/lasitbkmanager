import type { Request, Response, NextFunction } from 'express';
import * as contentService from '../../services/cms/content.service';
import * as distributionService from '../../services/cms/distribution.service';

// ─── 패키지 ───────────────────────────────────────────────────────

export async function listPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const published = req.query.published === 'true' ? true : req.query.published === 'false' ? false : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const result = await contentService.listPackages({ published, page, limit });
    res.json(result);
  } catch (e) { next(e); }
}

export async function getPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const pkg = await contentService.getPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    res.json(pkg);
  } catch (e) { next(e); }
}

export async function createPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const { weekNumber, title, description } = req.body as { weekNumber: number; title: string; description?: string };
    const pkg = await contentService.createPackage({ weekNumber, title, description }, req.user?.adminId);
    res.status(201).json(pkg);
  } catch (e) { next(e); }
}

export async function updatePackage(req: Request, res: Response, next: NextFunction) {
  try {
    const pkg = await contentService.updatePackage(req.params.id, req.body as { title?: string; description?: string });
    res.json(pkg);
  } catch (e) { next(e); }
}

export async function publishPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const pkg = await contentService.publishPackage(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    res.json(pkg);
  } catch (e) { next(e); }
}

export async function deletePackage(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deletePackage(req.params.id);
    res.json({ success: true });
  } catch (e) { next(e); }
}

// ─── 아이템 ───────────────────────────────────────────────────────

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, author, contentType, sortOrder } = req.body as {
      title: string; author?: string; contentType: string; sortOrder?: number;
    };
    const item = await contentService.addContentItem({
      packageId: req.params.id,
      title, author, contentType, sortOrder,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await contentService.updateContentItem(req.params.itemId, req.body as {
      title?: string; author?: string; storagePath?: string;
      fileSizeBytes?: number; durationSec?: number; sortOrder?: number;
    });
    res.json(item);
  } catch (e) { next(e); }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteContentItem(req.params.itemId);
    res.json({ success: true });
  } catch (e) { next(e); }
}

export async function getUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { filename, contentType } = req.body as { filename: string; contentType: string };
    const result = await contentService.getUploadUrl(req.params.itemId, filename, contentType);
    res.json(result);
  } catch (e) { next(e); }
}

export async function getDownloadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = req.user?.memberId ?? req.user?.adminId;
    if (!memberId) return res.status(401).json({ message: 'Unauthorized' });
    const url = await contentService.getDownloadUrl(req.params.itemId, memberId);
    res.json({ url });
  } catch (e) { next(e); }
}

// ─── 배포 ───────────────────────────────────────────────────────

export async function distributeToMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberId, weekNumber, fromWeek, toWeek } = req.body as {
      memberId: string; weekNumber?: number; fromWeek?: number; toWeek?: number;
    };
    let result;
    if (fromWeek && toWeek) {
      result = await distributionService.distributeHistorical(memberId, fromWeek, toWeek);
    } else if (weekNumber) {
      result = await distributionService.distributeToMember(memberId, weekNumber);
    } else {
      return res.status(400).json({ message: 'weekNumber or fromWeek+toWeek required' });
    }
    res.json({ success: true, result });
  } catch (e) { next(e); }
}

export async function distributeToAll(req: Request, res: Response, next: NextFunction) {
  try {
    const { weekNumber } = req.body as { weekNumber: number };
    const result = await distributionService.distributeCurrentWeekToAll(weekNumber);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
}

export async function getMemberAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await distributionService.getMemberAccess(req.params.memberId);
    res.json(result);
  } catch (e) { next(e); }
}
