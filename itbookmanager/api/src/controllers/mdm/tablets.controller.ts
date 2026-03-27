import type { Request, Response } from 'express';
import * as tabletsService from '../../services/mdm/tablets.service';

export async function list(req: Request, res: Response) {
  try {
    const { status, search, memberSearch, loanDateFrom, loanDateTo, storeId, page, limit } = req.query as Record<string, string>;
    // store_manager는 자신의 매장만 조회
    const effectiveStoreId = req.user?.role === 'store_manager'
      ? (req.user.storeId ?? undefined)
      : (storeId || undefined);
    res.json(await tabletsService.listTablets({
      status, search, memberSearch, loanDateFrom, loanDateTo,
      storeId: effectiveStoreId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    }));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getOne(req: Request, res: Response) {
  try {
    const tablet = await tabletsService.getTabletById(req.params.id);
    if (!tablet) return res.status(404).json({ error: 'Tablet not found' });
    res.json(tablet);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getByQr(req: Request, res: Response) {
  try {
    const tablet = await tabletsService.getTabletByQr(req.params.qrCode);
    if (!tablet) return res.status(404).json({ error: 'Tablet not found' });
    res.json(tablet);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function create(req: Request, res: Response) {
  try {
    // store_manager는 자신의 매장으로 자동 배정
    const storeId = req.user?.role === 'store_manager'
      ? req.user.storeId
      : req.body.storeId;
    res.status(201).json(await tabletsService.createTablet({ ...req.body, storeId }));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function update(req: Request, res: Response) {
  try {
    const tablet = await tabletsService.updateTablet(req.params.id, req.body);
    if (!tablet) return res.status(404).json({ error: 'Tablet not found' });
    res.json(tablet);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function loan(req: Request, res: Response) {
  try {
    const { memberId, processedBy, officerName } = req.body;
    if (!memberId && !processedBy && !officerName)
      return res.status(400).json({ error: '회원 또는 대여 담당자 정보가 필요합니다.' });
    res.json(await tabletsService.loanTablet(
      req.params.id,
      memberId ?? null,
      processedBy ?? req.user?.adminId,
      officerName,
    ));
  } catch (err) {
    const msg = String(err);
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('not available') || msg.includes('not active')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function returnTablet(req: Request, res: Response) {
  try {
    const { conditionOk, conditionNotes } = req.body;
    if (conditionOk === undefined) return res.status(400).json({ error: 'conditionOk required' });
    res.json(await tabletsService.returnTablet(
      req.params.id, conditionOk, conditionNotes, req.user?.adminId, req.user?.storeId
    ));
  } catch (err) {
    const msg = String(err);
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('not currently loaned')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function reportLost(req: Request, res: Response) {
  try {
    res.json(await tabletsService.reportLost(req.params.id, req.body.notes, req.user?.adminId));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function recover(req: Request, res: Response) {
  try {
    res.json(await tabletsService.recoverTablet(req.params.id, req.user?.adminId));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getHistory(req: Request, res: Response) {
  try {
    res.json(await tabletsService.getTabletHistory(req.params.id));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function batchCreate(req: Request, res: Response) {
  try {
    const { tablets } = req.body as { tablets: tabletsService.CreateTabletData[] };
    if (!Array.isArray(tablets) || tablets.length === 0)
      return res.status(400).json({ error: 'tablets array required' });
    // store_manager: 모든 태블릿에 자신의 매장 자동 배정
    const items = req.user?.role === 'store_manager'
      ? tablets.map(t => ({ ...t, storeId: req.user!.storeId ?? undefined }))
      : tablets;
    const results = await tabletsService.batchCreateTablets(items);
    res.status(201).json({ created: results.length, tablets: results });
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function remove(req: Request, res: Response) {
  try {
    await tabletsService.deleteTablet(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('삭제할 수 없습니다')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function bulkAssignStore(req: Request, res: Response) {
  try {
    if (req.user?.role !== 'system_admin')
      return res.status(403).json({ error: 'system_admin only' });
    const { tabletIds, storeId, isRelease } = req.body as { tabletIds: string[]; storeId: string | null; isRelease?: boolean };
    if (!Array.isArray(tabletIds) || tabletIds.length === 0)
      return res.status(400).json({ error: 'tabletIds array required' });
    res.json(await tabletsService.bulkAssignStore(tabletIds, storeId ?? null, !!isRelease));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function bulkAssignSubStore(req: Request, res: Response) {
  try {
    const { tabletIds, subStoreName } = req.body as { tabletIds: string[]; subStoreName: string | null };
    if (!Array.isArray(tabletIds) || tabletIds.length === 0)
      return res.status(400).json({ error: 'tabletIds array required' });
    res.json(await tabletsService.bulkAssignSubStore(tabletIds, subStoreName ?? null));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function regenQr(req: Request, res: Response) {
  try {
    res.json(await tabletsService.regenQrCode(req.params.id));
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getQrImage(req: Request, res: Response) {
  try {
    const tablet = await tabletsService.getTabletById(req.params.id);
    if (!tablet) return res.status(404).json({ error: 'Tablet not found' });
    // 매장 코드가 있으면 QR 내용에 포함 (예: LB101-TAB-000001)
    const buf = await tabletsService.generateQrImage(
      tablet.qr_code as string,
      tablet.store_code as string | null
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}
