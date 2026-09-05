import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authMiddleware, requireAuth } from '../middlewares';

export function createChatRouter(controller: ChatController): Router {
  const router = Router();

  // Masal Arkadaşı ile Sohbet Et
  router.post('/:storyId/chat', authMiddleware, requireAuth, controller.chatWithBuddy);

  return router;
}
