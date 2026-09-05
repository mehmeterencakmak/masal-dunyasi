import { Response, NextFunction } from 'express';
import { IFeedbackRepository } from '../../domain/repositories';
import { AuthRequest } from '../middlewares';
import { prisma } from '../../infrastructure/database/prismaClient';

export class FeedbackController {
  constructor(private feedbackRepo: IFeedbackRepository) {}

  // GET /api/feedbacks
  getAll = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const feedbacks = await this.feedbackRepo.findAll();
      res.json(feedbacks);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/feedbacks
  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Geri bildirim paylaşmak için giriş yapmanız gerekiyor' });
        return;
      }

      const { content, rating, role } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Yorum içeriği boş olamaz' });
        return;
      }

      if (content.trim().length > 300) {
        res.status(400).json({ error: 'Yorum en fazla 300 karakter olabilir' });
        return;
      }

      const ratingVal = parseInt(rating, 10);
      if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        res.status(400).json({ error: 'Puan 1-5 arasında bir rakam olmalıdır' });
        return;
      }

      const roleStr = role ? role.trim() : 'Ebeveyn';
      if (roleStr.length > 50) {
        res.status(400).json({ error: 'Rol alanı en fazla 50 karakter olabilir' });
        return;
      }

      const feedback = await this.feedbackRepo.create({
        userId: req.userId,
        content: content.trim(),
        rating: ratingVal,
        role: roleStr,
      });

      res.status(201).json(feedback);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/feedbacks/:id
  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id } = req.params;
      const { content, rating, role } = req.body;

      const feedback = await this.feedbackRepo.findById(id);
      if (!feedback) {
        res.status(404).json({ error: 'Geri bildirim bulunamadı' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const isOwner = feedback.userId === req.userId;
      const isAdmin = user?.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu geri bildirimi düzenleme yetkiniz yok' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'İçerik boş olamaz' });
        return;
      }

      const ratingVal = parseInt(rating, 10);
      if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        res.status(400).json({ error: 'Puan 1-5 arasında olmalıdır' });
        return;
      }

      const roleStr = role ? role.trim() : 'Ebeveyn';

      const updated = await this.feedbackRepo.update(id, {
        content: content.trim(),
        rating: ratingVal,
        role: roleStr,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/feedbacks/:id
  delete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Feedback delete request received. params:', req.params, 'userId:', req.userId);
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id } = req.params;
      const feedback = await this.feedbackRepo.findById(id);
      if (!feedback) {
        console.log('Feedback not found for id:', id);
        res.status(404).json({ error: 'Geri bildirim bulunamadı' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const isOwner = feedback.userId === req.userId;
      const isAdmin = user?.role === 'ADMIN';

      console.log('Feedback auth check. isOwner:', isOwner, 'isAdmin:', isAdmin, 'feedbackUserId:', feedback.userId, 'reqUserId:', req.userId);

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu geri bildirimi silme yetkiniz yok' });
        return;
      }

      await this.feedbackRepo.delete(id);
      console.log('Feedback deleted successfully:', id);
      res.status(204).send();
    } catch (err) {
      console.error('Error in Feedback delete controller:', err);
      next(err);
    }
  };
}
