import type { Request, Response } from 'express';
import * as storesService from '../../services/admin/stores.service';

export async function list(req: Request, res: Response) {
  try {
    const stores = await storesService.listStores(req.query.includeInactive === 'true');
    res.json(stores);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function getOne(req: Request, res: Response) {
  try {
    const store = await storesService.getStoreById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}

export async function create(req: Request, res: Response) {
  try {
    const { code, name, address, phone } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name required' });
    const store = await storesService.createStore({ code, name, address, phone });
    res.status(201).json(store);
  } catch (err) {
    const msg = String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return res.status(409).json({ error: '이미 사용 중인 코드 또는 이름입니다.' });
    }
    res.status(500).json({ error: msg });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const store = await storesService.updateStore(req.params.id, req.body);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
}
