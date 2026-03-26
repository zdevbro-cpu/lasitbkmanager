import { Router } from 'express';
import { requireAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/dashboard/dashboard.controller';

const router = Router();

router.use(requireAdmin);
router.get('/stats', ctrl.getStats);
router.get('/activity', ctrl.getActivity);

export default router;
