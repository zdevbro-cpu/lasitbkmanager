import { Router } from 'express';
import { requireAdmin, requireSystemAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/admin/stores.controller';

const router = Router();

router.get('/',      requireAdmin,       ctrl.list);    // 모든 관리자 접근 가능 (목록 조회)
router.get('/:id',   requireAdmin,       ctrl.getOne);
router.post('/',     requireSystemAdmin, ctrl.create);
router.put('/:id',   requireSystemAdmin, ctrl.update);

export default router;
