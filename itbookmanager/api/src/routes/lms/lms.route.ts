import { Router } from 'express';
import { requireAdmin, requireMember } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/lms/progress.controller';

const router = Router();

// 진도 업데이트 (회원 전용)
router.patch('/progress', requireMember, ctrl.updateProgress);
router.post('/progress/:itemId/complete', requireMember, ctrl.markCompleted);

// 학습 리포트
router.get('/report/:memberId', requireAdmin, ctrl.getMemberReport);
router.get('/report', requireAdmin, ctrl.getBulkReport);

export default router;
