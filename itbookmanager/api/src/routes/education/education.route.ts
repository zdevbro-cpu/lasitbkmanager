import { Router } from 'express';
import { requireAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/education/education.controller';

const router = Router();

router.use(requireAdmin);
router.get('/', ctrl.listSessions);
router.post('/', ctrl.createSession);
router.put('/:id', ctrl.updateSession);
router.delete('/:id', ctrl.deleteSession);

export default router;
