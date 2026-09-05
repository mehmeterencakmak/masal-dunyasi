import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authMiddleware, requireAuth, adminMiddleware } from '../middlewares';

export function createAdminRouter(adminController: AdminController): Router {
  const router = Router();

  // POST /api/admin/become-admin (JWT gerekmez — direkt admin girişi)
  router.post('/become-admin', adminController.becomeAdmin);

  // Tüm alt rotalar: önce token parse, sonra auth + admin kontrolü
  router.use(authMiddleware, requireAuth, adminMiddleware);

  router.get('/users', adminController.getUsers);
  router.put('/users/:id/block', adminController.toggleBlockUser);
  router.delete('/users/:id', adminController.deleteUser);

  router.get('/stories', adminController.getStories);
  router.put('/stories/:id', adminController.updateStory);
  router.delete('/stories/:id', adminController.deleteStory);
  router.post('/stories/:id/approve', adminController.approveStory);
  router.post('/stories/:id/block', adminController.blockStory);

  router.get('/comments', adminController.getComments);
  router.delete('/comments/:id', adminController.deleteComment);
  router.post('/comments/:id/approve', adminController.approveComment);
  router.post('/comments/:id/block', adminController.blockComment);

  return router;
}
