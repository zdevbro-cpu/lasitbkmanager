import { Router } from 'express';
import { requireAdmin, requireSystemAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/admin/staff.controller';

const router = Router();

router.get('/me', requireAdmin, ctrl.getMe);
router.get('/', requireSystemAdmin, ctrl.list);
router.post('/', requireSystemAdmin, ctrl.create);
router.put('/:id', requireSystemAdmin, ctrl.update);
router.delete('/:id', requireSystemAdmin, ctrl.remove);

export default router;
