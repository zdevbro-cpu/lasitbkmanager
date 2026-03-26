import type { Request, Response } from 'express';
import * as membersService from '../../services/crm/members.service';

export async function getQrImage(req: Request, res: Response) {
  try {
    const buf = await membersService.getMemberQrImage(req.params.id);
    if (!buf) return res.status(404).json({ error: 'QR not found' });
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getByQr(req: Request, res: Response) {
  try {
    const member = await membersService.getMemberByQrCode(req.params.code);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function list(req: Request, res: Response) {
  try {
    const { type, status, search, page, limit, excludeWithdrawn, storeId } = req.query as Record<string, string>;
    // store_manager는 자신의 매장만 조회
    const effectiveStoreId = req.user?.role === 'store_manager'
      ? (req.user.storeId ?? undefined)
      : (storeId || undefined);
    const result = await membersService.listMembers({
      type, status, search,
      excludeWithdrawn: excludeWithdrawn === 'true',
      storeId: effectiveStoreId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const member = await membersService.getMemberById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const storeId = req.user?.role === 'store_manager'
      ? req.user.storeId
      : req.body.storeId;
    const member = await membersService.createMember({
      ...req.body,
      createdBy: req.user?.adminId,
      storeId: storeId ?? undefined,
    });
    res.status(201).json(member);
  } catch (err) {
    const msg = String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return res.status(409).json({ error: '이미 등록된 이메일입니다.' });
    }
    res.status(500).json({ error: msg });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const member = await membersService.updateMember(req.params.id, req.body);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export async function changeStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const member = await membersService.changeMemberStatus(req.params.id, status);
    res.json(member);
  } catch (err) {
    const msg = String(err);
    if (msg.includes('Cannot transition') || msg.includes('태블릿')) return res.status(400).json({ error: msg });
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function changeType(req: Request, res: Response) {
  try {
    const { newType, changeReason, priceDiffKrw } = req.body;
    if (!newType || !changeReason) {
      return res.status(400).json({ error: 'newType and changeReason required' });
    }
    const member = await membersService.changeMemberType(
      req.params.id, newType, changeReason,
      req.user?.adminId, priceDiffKrw
    );
    res.json(member);
  } catch (err) {
    const msg = String(err);
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('Already this type')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function getTypeHistory(req: Request, res: Response) {
  try {
    const history = await membersService.getMemberTypeHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const result = await membersService.deleteMember(req.params.id);
    if (!result) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
