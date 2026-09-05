import { Router } from 'express';
import { ArtworkController } from '../controllers/artworkController';
import { authMiddleware, requireAuth } from '../middlewares';

export function createArtworkRouter(controller: ArtworkController): Router {
  const router = Router();

  // Tüm boyama eserlerini getir
  router.get('/', controller.getAll);

  // Tek boyama eseri detayını getir
  router.get('/:id', controller.getById);

  // Yeni boyama eseri oluştur / güncelle (oturum açmış kullanıcılar)
  router.post('/', authMiddleware, requireAuth, controller.create);

  // Boyama eserini sil (sahibi veya admin)
  router.delete('/:id', authMiddleware, requireAuth, controller.delete);

  // Eserlere reaksiyon bırak / kaldır (oturum açmış kullanıcılar)
  router.post('/:id/react', authMiddleware, requireAuth, controller.react);

  return router;
}
