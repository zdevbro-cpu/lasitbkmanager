import { Request, Response, NextFunction } from 'express';
import * as svc from '../../services/admin/staff.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await svc.listStaff();
    res.json(staff);
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.adminId!;
    const staff = await svc.getMe(adminId);
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json(staff);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'name, email, role are required' });
    }
    const result = await svc.createStaff({ name, email, role, phone });
    res.status(201).json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return res.status(409).json({ error: '이미 등록된 이메일입니다' });
    }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, role, phone, is_active, storeId } = req.body;
    const staff = await svc.updateStaff(id, { name, role, phone, is_active, storeId });
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json(staff);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    // 본인 삭제 방지
    if (req.user?.adminId === id) {
      return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다' });
    }
    await svc.deleteStaff(id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getByQr(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const staff = await svc.getStaffByReferralCode(code);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) { next(err); }
}

export async function getByName(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.params;
    const staff = await svc.getStaffByName(decodeURIComponent(name));
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) { next(err); }
}
