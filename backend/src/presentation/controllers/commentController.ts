import { Response, NextFunction } from 'express';
import { ICommentRepository, IStoryRepository } from '../../domain/repositories';
import { AuthRequest } from '../middlewares';
import { prisma } from '../../infrastructure/database/prismaClient';

export class CommentController {
  constructor(
    private commentRepo: ICommentRepository,
    private storyRepo: IStoryRepository,
  ) {}

  // GET /api/stories/:id/comments
  getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const comments = await this.commentRepo.findByStoryId(id);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/comments
  addComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Yorum yapabilmek için giriş yapmanız gerekiyor' });
        return;
      }

      const { id } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Yorum içeriği boş olamaz' });
        return;
      }

      if (content.trim().length > 500) {
        res.status(400).json({ error: 'Yorum en fazla 500 karakter olabilir' });
        return;
      }

      const story = await this.storyRepo.findById(id);
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı' });
        return;
      }

      const comment = await this.commentRepo.create({
        storyId: id,
        userId: req.userId,
        content: content.trim(),
      });

      // commentsCount'u artır
      await this.storyRepo.update(id, {
        commentsCount: (story.commentsCount || 0) + 1,
      });

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/stories/:id/comments/:commentId
  deleteComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id, commentId } = req.params;

      const comment = await this.commentRepo.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı' });
        return;
      }

      const story = await this.storyRepo.findById(id);
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı' });
        return;
      }

      // Sadece masalın sahibi veya admin silebilir
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const isStoryOwner = story.userId === req.userId;
      const isAdmin = user?.role === 'ADMIN';

      if (!isStoryOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu yorumu silme yetkiniz yok' });
        return;
      }

      await this.commentRepo.delete(commentId);

      // commentsCount'u azalt
      await this.storyRepo.update(id, {
        commentsCount: Math.max(0, (story.commentsCount || 1) - 1),
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/stories/:id/comments/:commentId
  updateComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id, commentId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Yorum içeriği boş olamaz' });
        return;
      }

      const comment = await this.commentRepo.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı' });
        return;
      }

      const story = await this.storyRepo.findById(id);
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı' });
        return;
      }

      // Sadece masalın sahibi veya admin güncelleyebilir
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const isStoryOwner = story.userId === req.userId;
      const isAdmin = user?.role === 'ADMIN';

      if (!isStoryOwner && !isAdmin) {
        res.status(403).json({ error: 'Bu yorumu düzenleme yetkiniz yok' });
        return;
      }

      const updatedComment = await this.commentRepo.update(commentId, content.trim());
      res.json(updatedComment);
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/comments/:commentId/report
  reportComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { commentId } = req.params;
      const comment = await this.commentRepo.findById(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı' });
        return;
      }

      const updatedReports = ((comment as any).reports || 0) + 1;
      // İlk şikayette dahi durumu REPORTED yapıp anasayfadan/detaydan kaldırıyoruz
      const dataToUpdate = { 
        reports: updatedReports, 
        status: 'REPORTED' 
      };

      await prisma.comment.update({
        where: { id: commentId },
        data: dataToUpdate,
      });

      res.json({ message: 'Yorum başarıyla bildirildi.', reports: updatedReports });
    } catch (err) {
      next(err);
    }
  };
}
