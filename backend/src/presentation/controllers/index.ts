// ─── CONTROLLER'LAR ──────────────────────────────────────────────────────────
// USE CASE: İş mantığı use case katmanında, controller sadece HTTP yönetir.
// Controller ne ne agent ne de repository'yi doğrudan çağırır.

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares';
import { GenerateStoryUseCase } from '../../application/use-cases/GenerateStoryUseCase';
import {
  GenerateTTSUseCase,
  GenerateImageUseCase,
  GenerateMusicUseCase,
  GenerateVideoUseCase,
  GenerateColoringUseCase,
} from '../../application/use-cases/AgentUseCases';
import { IStoryRepository, IJobRepository, ILikeRepository } from '../../domain/repositories';
import { toStoryResponseDTO } from '../../application/dtos';

// ─── StoryController ─────────────────────────────────────────────────────────
export class StoryController {
  constructor(
    private generateStoryUC: GenerateStoryUseCase,
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private likeRepo: ILikeRepository
  ) {}

  // POST /api/stories/generate
  generate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.generateStoryUC.execute({
        prompt: req.body.prompt,
        language: req.body.language,
        userId: req.userId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  // GET /api/stories/:id
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story || (story as any).moderationStatus === 'BLOCKED' || (story as any).reports >= 3) {
        res.status(404).json({ error: 'Hikaye bulunamadı veya kilitlendi.' });
        return;
      }
      const jobs = await this.jobRepo.findByStoryId(story.id);
      res.json(toStoryResponseDTO(story, jobs));
    } catch (err) {
      next(err);
    }
  };

  // GET /api/stories
  getAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stories = await this.storyRepo.findAll();
      res.json(stories.map(s => toStoryResponseDTO(s)));
    } catch (err) {
      next(err);
    }
  };

  // DELETE /api/stories/:id
  delete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      await this.storyRepo.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/report
  reportStory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const story = await this.storyRepo.findById(id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı.' });
        return;
      }

      const updatedReports = ((story as any).reports || 0) + 1;
      const dataToUpdate: any = { reports: updatedReports };

      if (updatedReports >= 3) {
        dataToUpdate.moderationStatus = 'REPORTED';
      }

      await this.storyRepo.update(id, dataToUpdate);

      res.json({ message: 'Hikaye başarıyla bildirildi.', reports: updatedReports });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/like
  like = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      
      let alreadyLiked = false;
      if (req.userId) {
        alreadyLiked = await this.likeRepo.exists(req.userId, req.params.id);
        if (!alreadyLiked) {
          await this.likeRepo.create(req.userId, req.params.id);
        }
      }

      const increment = alreadyLiked ? 0 : 1;
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likes: (story.likes || 0) + increment,
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/unlike
  unlike = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }

      let wasLiked = false;
      if (req.userId) {
        wasLiked = await this.likeRepo.exists(req.userId, req.params.id);
        if (wasLiked) {
          await this.likeRepo.delete(req.userId, req.params.id);
        }
      }

      const decrement = (req.userId ? wasLiked : true) ? 1 : 0;
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likes: Math.max(0, (story.likes || 0) - decrement),
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/like-thumbsup
  likeThumbsUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likesThumbsUp: (story.likesThumbsUp || 0) + 1,
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/unlike-thumbsup
  unlikeThumbsUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likesThumbsUp: Math.max(0, (story.likesThumbsUp || 0) - 1),
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/like-stars
  likeStars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likesStars: (story.likesStars || 0) + 1,
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/unlike-stars
  unlikeStars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        likesStars: Math.max(0, (story.likesStars || 0) - 1),
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/view
  incrementViews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        views: (story.views || 0) + 1,
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };

  // POST /api/stories/:id/comment
  addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const story = await this.storyRepo.findById(req.params.id);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }
      const updatedStory = await this.storyRepo.update(req.params.id, {
        commentsCount: (story.commentsCount || 0) + 1,
      });
      res.json(toStoryResponseDTO(updatedStory));
    } catch (err) {
      next(err);
    }
  };
}

// ─── AgentController ─────────────────────────────────────────────────────────
export class AgentController {
  constructor(
    private ttsUC: GenerateTTSUseCase,
    private imageUC: GenerateImageUseCase,
    private musicUC: GenerateMusicUseCase,
    private videoUC: GenerateVideoUseCase,
    private coloringUC: GenerateColoringUseCase,
    private jobRepo: IJobRepository
  ) {}

  // POST /api/agents/tts/:storyId
  generateTTS = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = await this.ttsUC.execute(req.params.storyId, req.userId!);
      res.json({ url, agentType: 'TTS' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/agents/image/:storyId
  generateImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = await this.imageUC.execute(req.params.storyId, req.userId!);
      res.json({ url, agentType: 'IMAGE' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/agents/music/:storyId
  generateMusic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = await this.musicUC.execute(req.params.storyId, req.userId!);
      res.json({ url, agentType: 'MUSIC' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/agents/video/:storyId
  generateVideo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = await this.videoUC.execute(req.params.storyId, req.userId!);
      res.json({ url, agentType: 'VIDEO' });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/agents/coloring/:storyId
  generateColoring = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = await this.coloringUC.execute(req.params.storyId, req.userId!);
      res.json({ url, agentType: 'COLORING' });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/jobs/:jobId/status
  getJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await this.jobRepo.findById(req.params.jobId);
      if (!job) {
        res.status(404).json({ error: 'İş bulunamadı' });
        return;
      }
      res.json({
        id: job.id,
        storyId: job.storyId,
        agentType: job.agentType,
        status: job.status,
        error: job.error,
        completedAt: job.completedAt?.toISOString(),
        result: job.result ? JSON.parse(job.result) : null,
      });
    } catch (err) {
      next(err);
    }
  };
}

export * from './authController';
export * from './userController';
export * from './commentController';
export * from './feedbackController';
export * from './adminController';
export * from './artworkController';

