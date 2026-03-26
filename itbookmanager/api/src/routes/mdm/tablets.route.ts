import { Router } from 'express';
import { requireAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/mdm/tablets.controller';

const router = Router();

router.get('/', requireAdmin, ctrl.list);
router.post('/', requireAdmin, ctrl.create);
router.post('/batch', requireAdmin, ctrl.batchCreate);         // 엑셀 배치 등록
router.patch('/bulk-assign', requireAdmin, ctrl.bulkAssignStore); // 일괄 라스브러리 배정
router.get('/qr/:qrCode', requireAdmin, ctrl.getByQr);         // QR 스캔으로 조회
router.get('/:id', requireAdmin, ctrl.getOne);
router.put('/:id', requireAdmin, ctrl.update);
router.post('/:id/loan', requireAdmin, ctrl.loan);
router.post('/:id/return', requireAdmin, ctrl.returnTablet);
router.post('/:id/lost', requireAdmin, ctrl.reportLost);
router.post('/:id/recover', requireAdmin, ctrl.recover);
router.get('/:id/history', requireAdmin, ctrl.getHistory);
router.delete('/:id', requireAdmin, ctrl.remove);
router.post('/:id/regen-qr', requireAdmin, ctrl.regenQr);
// qr-image는 server.ts에서 인증 없이 등록됨

export default router;
