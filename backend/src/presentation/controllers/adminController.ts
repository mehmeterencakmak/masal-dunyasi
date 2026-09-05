import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/database/prismaClient';
import { logger } from '../../infrastructure/logger';
import { AuthRequest } from '../middlewares';

export class AdminController {
  // POST /api/admin/login — JWT gerektirmez, direkt admin girişi
  becomeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { adminUsername, adminPassword } = req.body;

      if (!adminUsername || !adminPassword) {
        res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
        return;
      }

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026!';

      if (adminUsername !== ADMIN_USERNAME || adminPassword !== ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Admin kullanıcı adı veya şifre hatalı.' });
        return;
      }

      // Admin kullanıcısını bul veya oluştur
      const adminEmail = `${ADMIN_USERNAME}@admin.local`;
      let adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: adminEmail,
            password: 'ADMIN_ACCOUNT_NO_PASSWORD',
            name: 'Yönetici',
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });
        logger.info(`Admin hesabı oluşturuldu: ${adminUser.email}`);
      }

      // Admin için JWT üret
      const token = jwt.sign(
        { userId: adminUser.id },
        process.env.JWT_SECRET ?? 'dev_secret',
        { expiresIn: '8h' }
      );

      logger.info(`Admin girişi yapıldı: ${adminUser.email}`);
      res.json({
        token,
        message: 'Admin girişi başarılı.',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name || 'Yönetici',
          role: adminUser.role,
          status: adminUser.status,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/admin/users
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              stories: true,
              comments: true,
            },
          },
        },
      });

      const formatted = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || 'Gizemli Kullanıcı',
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        storiesCount: u._count.stories,
        commentsCount: u._count.comments,
      }));

      res.json(formatted);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/admin/users/:id/block
  toggleBlockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        return;
      }

      if (user.role === 'ADMIN') {
        res.status(400).json({ error: 'Yöneticiler engellenemez!' });
        return;
      }

      const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
      const updated = await prisma.user.update({
        where: { id },
        data: { status: newStatus },
      });

      logger.info(`Kullanıcı durumu güncellendi: ${updated.email} (${newStatus})`);
      res.json({
        message: `Kullanıcı durumu ${newStatus === 'BLOCKED' ? 'Engellendi' : 'Aktif'} olarak değiştirildi.`,
        user: {
          id: updated.id,
          email: updated.email,
          status: updated.status,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/admin/users/:id
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        return;
      }

      if (user.role === 'ADMIN') {
        res.status(400).json({ error: 'Yöneticiler silinemez!' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      logger.info(`Kullanıcı ve ilişkili verileri tamamen silindi: ${user.email}`);
      res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/admin/stories
  getStories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stories = await prisma.story.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json(stories);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/admin/stories/:id
  updateStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, content, summary } = req.body;

      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı.' });
        return;
      }

      const updated = await prisma.story.update({
        where: { id },
        data: {
          title: title !== undefined ? title : story.title,
          content: content !== undefined ? content : story.content,
          summary: summary !== undefined ? summary : story.summary,
        },
      });

      logger.info(`Masal yönetici tarafından güncellendi: ${updated.id} - ${updated.title}`);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/admin/stories/:id
  deleteStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const story = await prisma.story.findUnique({ where: { id } });

      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı.' });
        return;
      }

      await prisma.story.delete({ where: { id } });

      logger.info(`Masal yönetici tarafından silindi: ${story.id}`);
      res.json({ message: 'Masal başarıyla silindi.' });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/admin/comments
  getComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comments = await prisma.comment.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          story: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.json(comments);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/admin/comments/:id
  deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      await prisma.comment.delete({ where: { id } });

      // Masalın commentsCount değerini azalt
      await prisma.story.update({
        where: { id: comment.storyId },
        data: { commentsCount: { decrement: 1 } },
      });

      logger.info(`Yorum yönetici tarafından silindi: ${comment.id}`);
      res.json({ message: 'Yorum başarıyla silindi.' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/admin/stories/:id/approve
  approveStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı.' });
        return;
      }

      await prisma.story.update({
        where: { id },
        data: { reports: 0, moderationStatus: 'APPROVED' },
      });

      logger.info(`Masal yönetici tarafından onaylandı: ${id}`);
      res.json({ message: 'Masal başarıyla onaylandı.' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/admin/stories/:id/block
  blockStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı.' });
        return;
      }

      await prisma.story.update({
        where: { id },
        data: { moderationStatus: 'BLOCKED' },
      });

      logger.info(`Masal yönetici tarafından engellendi: ${id}`);
      res.json({ message: 'Masal başarıyla engellendi.' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/admin/comments/:id/approve
  approveComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      await prisma.comment.update({
        where: { id },
        data: { reports: 0, status: 'APPROVED' },
      });

      logger.info(`Yorum yönetici tarafından onaylandı: ${id}`);
      res.json({ message: 'Yorum başarıyla onaylandı.' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/admin/comments/:id/block
  blockComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        res.status(404).json({ error: 'Yorum bulunamadı.' });
        return;
      }

      await prisma.comment.update({
        where: { id },
        data: { status: 'BLOCKED' },
      });

      logger.info(`Yorum yönetici tarafından engellendi: ${id}`);
      res.json({ message: 'Yorum başarıyla engellendi.' });
    } catch (err) {
      next(err);
    }
  };
}
