import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { IUserRepository, IStoryRepository, ICommentRepository, ILikeRepository } from '../../domain/repositories';
import { AuthRequest } from '../middlewares';

export class UserController {
  constructor(
    private userRepo: IUserRepository,
    private storyRepo: IStoryRepository,
    private commentRepo: ICommentRepository,
    private likeRepo: ILikeRepository,
  ) {}

  // GET /api/users/me/stories
  getMyStories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }
      const stories = await this.storyRepo.findByUserId(req.userId);
      res.json(stories);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/users/me/comments
  getMyComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }
      const comments = await this.commentRepo.findByUserId(req.userId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/users/me/likes
  getMyLikes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }
      const likedStories = await this.likeRepo.findByUserId(req.userId);
      res.json(likedStories);
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/users/me — profil güncelle (isim)
  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { name } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'İsim boş olamaz' });
        return;
      }

      const updated = await this.userRepo.update(req.userId, { name: name.trim() });
      res.json({ id: updated.id, email: updated.email, name: updated.name });
    } catch (err) {
      next(err);
    }
  };

  // PUT /api/users/me/password — şifre değiştir
  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Mevcut ve yeni şifre gereklidir' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır' });
        return;
      }

      const user = await this.userRepo.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ error: 'Mevcut şifre hatalı' });
        return;
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await this.userRepo.update(req.userId, { password: hashed });

      res.json({ message: 'Şifreniz başarıyla güncellendi' });
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/stories/:id (ownership check burada)
  deleteMyStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id } = req.params;
      const story = await this.storyRepo.findById(id);

      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı' });
        return;
      }

      if (story.userId !== req.userId) {
        res.status(403).json({ error: 'Bu masalı silme yetkiniz yok' });
        return;
      }

      await this.storyRepo.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/stories/:id/remove-image
  removeStoryImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
        return;
      }

      const { id } = req.params;
      const story = await this.storyRepo.findById(id);

      if (!story) {
        res.status(404).json({ error: 'Masal bulunamadı' });
        return;
      }

      if (story.userId !== req.userId) {
        res.status(403).json({ error: 'Bu masalı düzenleme yetkiniz yok' });
        return;
      }

      const updated = await this.storyRepo.update(id, { imageUrl: undefined });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}
