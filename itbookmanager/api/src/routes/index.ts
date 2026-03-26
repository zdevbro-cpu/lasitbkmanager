import { Router } from 'express';
import membersRouter from './crm/members.route';
import tabletsRouter from './mdm/tablets.route';
import contentRouter from './cms/content.route';
import lmsRouter from './lms/lms.route';
import paymentsRouter from './payments/payments.route';
import dashboardRouter from './dashboard/dashboard.route';
import educationRouter from './education/education.route';
import staffRouter from './admin/staff.route';
import storesRouter from './admin/stores.route';

const router = Router();

router.use('/stores', storesRouter);
router.use('/staff', staffRouter);
router.use('/members', membersRouter);
router.use('/tablets', tabletsRouter);
router.use('/content', contentRouter);
router.use('/lms', lmsRouter);
router.use('/payments', paymentsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/education', educationRouter);

export default router;
