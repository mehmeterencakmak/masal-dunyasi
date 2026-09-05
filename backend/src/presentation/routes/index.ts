// ─── ROUTE TANIMLARI ─────────────────────────────────────────────────────────
// Controller'lar dependency injection container'dan alınır.

import { Router } from 'express';
import { StoryController, AgentController, UserController, CommentController, FeedbackController, AdminController } from '../controllers';
import {
  authMiddleware,
  requireAuth,
  validate,
  storyRequestSchema,
} from '../middlewares';

// ─── Story Routes ─────────────────────────────────────────────────────────────
export function createStoryRouter(
  controller: StoryController,
  commentController: CommentController,
  userController: UserController,
  generateLimiter?: any
): Router {
  const router = Router();

  // Hikaye oluştur — rate limit sadece bu pahalı endpoint için geçerlidir
  router.post(
    '/generate',
    generateLimiter ? generateLimiter : (req: any, res: any, next: any) => next(),
    authMiddleware,
    validate(storyRequestSchema),
    controller.generate
  );

  // Tüm hikayeler
  router.get('/', authMiddleware, controller.getAll);

  // Tek hikaye
  router.get('/:id', controller.getById);

  // Hikaye beğen/beğenmekten vazgeç
  router.post('/:id/like', authMiddleware, controller.like);
  router.post('/:id/unlike', authMiddleware, controller.unlike);

  // Thumbs up beğenisi/beğenmekten vazgeç
  router.post('/:id/like-thumbsup', controller.likeThumbsUp);
  router.post('/:id/unlike-thumbsup', controller.unlikeThumbsUp);

  // Yıldız beğenisi/beğenmekten vazgeç
  router.post('/:id/like-stars', controller.likeStars);
  router.post('/:id/unlike-stars', controller.unlikeStars);

  // Hikaye izlenme sayısı arttır
  router.post('/:id/view', controller.incrementViews);

  // ─── YORUM ENDPOINT'LERİ (DATABASE TABANLI) ───
  // Hikayenin yorumlarını getir
  router.get('/:id/comments', commentController.getComments);
  // Yorum ekle
  router.post('/:id/comments', authMiddleware, requireAuth, commentController.addComment);
  // Yorum güncelle
  router.put('/:id/comments/:commentId', authMiddleware, requireAuth, commentController.updateComment);
  // Yorum sil
  router.delete('/:id/comments/:commentId', authMiddleware, requireAuth, commentController.deleteComment);
  // Yorum bildir
  router.post('/:id/comments/:commentId/report', authMiddleware, requireAuth, commentController.reportComment);

  // Hikaye görselini sil (sadece sahibi)
  router.patch('/:id/remove-image', authMiddleware, requireAuth, userController.removeStoryImage);

  // Hikaye sil (sadece sahibi)
  router.delete('/:id', authMiddleware, requireAuth, userController.deleteMyStory);
  // Hikaye bildir
  router.post('/:id/report', authMiddleware, requireAuth, controller.reportStory);

  return router;
}

// ─── User Routes ──────────────────────────────────────────────────────────────
export function createUserRouter(controller: UserController): Router {
  const router = Router();

  // Giriş yapmış kullanıcının kendi verileri
  router.get('/me/stories', authMiddleware, requireAuth, controller.getMyStories);
  router.get('/me/comments', authMiddleware, requireAuth, controller.getMyComments);
  router.get('/me/likes', authMiddleware, requireAuth, controller.getMyLikes);
  router.put('/me', authMiddleware, requireAuth, controller.updateProfile);
  router.put('/me/password', authMiddleware, requireAuth, controller.changePassword);

  return router;
}

// ─── Agent Routes ─────────────────────────────────────────────────────────────
export function createAgentRouter(controller: AgentController): Router {
  const router = Router();

  // Agent tetikleme endpoint'leri — her biri bağımsız çalışır
  router.post('/tts/:storyId', authMiddleware, requireAuth, controller.generateTTS);
  router.post('/image/:storyId', authMiddleware, requireAuth, controller.generateImage);
  router.post('/music/:storyId', authMiddleware, requireAuth, controller.generateMusic);
  router.post('/video/:storyId', authMiddleware, requireAuth, controller.generateVideo);
  router.post('/coloring/:storyId', authMiddleware, requireAuth, controller.generateColoring);

  // Job durum sorgulama
  router.get('/jobs/:jobId/status', controller.getJobStatus);

  return router;
}

// ─── Feedback Routes ─────────────────────────────────────────────────────────
export function createFeedbackRouter(controller: FeedbackController): Router {
  const router = Router();
  router.get('/', controller.getAll);
  router.post('/', authMiddleware, requireAuth, controller.create);
  router.put('/:id', authMiddleware, requireAuth, controller.update);
  router.delete('/:id', authMiddleware, requireAuth, controller.delete);
  return router;
}

export * from './authRoutes';
export * from './chatRoutes';
export * from './adminRoutes';
export * from './artworkRoutes';

