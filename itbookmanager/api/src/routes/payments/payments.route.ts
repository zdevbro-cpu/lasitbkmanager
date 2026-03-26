import { Router } from 'express';
import { requireAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/payments/payments.controller';

const router = Router();

router.use(requireAdmin);

router.get('/', ctrl.listPayments);
router.post('/', ctrl.createPayment);

router.get('/refunds', ctrl.listRefunds);
router.get('/refunds/calculate', ctrl.calculateRefundPreview);
router.post('/refunds', ctrl.requestRefund);
router.patch('/refunds/:id/approve', ctrl.approveRefund);
router.patch('/refunds/:id/reject', ctrl.rejectRefund);

export default router;
