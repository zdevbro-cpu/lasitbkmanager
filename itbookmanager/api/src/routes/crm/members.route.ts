import { Router } from 'express';
import { requireAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/crm/members.controller';

const router = Router();

router.get('/', requireAdmin, ctrl.list);
router.post('/', requireAdmin, ctrl.create);
router.get('/counts', requireAdmin, ctrl.statusCounts);
router.get('/check-email', requireAdmin, ctrl.checkEmail);
router.get('/qr/:code', requireAdmin, ctrl.getByQr);
router.get('/:id/qr-image', requireAdmin, ctrl.getQrImage);
router.get('/:id', requireAdmin, ctrl.getOne);
router.put('/:id', requireAdmin, ctrl.update);
router.patch('/:id/status', requireAdmin, ctrl.changeStatus);
router.patch('/:id/type', requireAdmin, ctrl.changeType);
router.get('/:id/type-history', requireAdmin, ctrl.getTypeHistory);
router.delete('/:id', requireAdmin, ctrl.remove);

export default router;
