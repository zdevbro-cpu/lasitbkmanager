import { Router } from 'express';
import { requireAdmin, requireSystemAdmin } from '../../middleware/role.middleware';
import * as ctrl from '../../controllers/cms/content.controller';

const router = Router();

// 패키지 조회 (관리자 + 회원 모두)
router.get('/packages', ctrl.listPackages);
router.get('/packages/:id', ctrl.getPackage);

// 패키지 관리 (시스템관리자 전용)
router.post('/packages', requireSystemAdmin, ctrl.createPackage);
router.put('/packages/:id', requireSystemAdmin, ctrl.updatePackage);
router.patch('/packages/:id/publish', requireSystemAdmin, ctrl.publishPackage);
router.delete('/packages/:id', requireSystemAdmin, ctrl.deletePackage);

// 콘텐츠 아이템 (시스템관리자 전용)
router.post('/packages/:id/items', requireSystemAdmin, ctrl.addItem);
router.put('/items/:itemId', requireSystemAdmin, ctrl.updateItem);
router.delete('/items/:itemId', requireSystemAdmin, ctrl.deleteItem);

// 파일 업로드/다운로드 URL
router.post('/items/:itemId/upload-url', requireSystemAdmin, ctrl.getUploadUrl);
router.get('/items/:itemId/url', ctrl.getDownloadUrl);  // 회원도 접근 가능 (내부 권한 확인)

// 배포 (시스템관리자 전용)
router.post('/distribute', requireSystemAdmin, ctrl.distributeToMember);
router.post('/distribute/all', requireSystemAdmin, ctrl.distributeToAll);
router.get('/access/:memberId', requireAdmin, ctrl.getMemberAccess);

export default router;
