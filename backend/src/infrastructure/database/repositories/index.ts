// ─── PRISMA REPOSITORY İMPLEMENTASYONLARI ───────────────────────────────────
// REPOSITORY: Veritabanı işlemleri bu katmanda soyutlanır.
// Domain katmanı ve use case'ler Prisma'yı doğrudan görmez.

import { prisma } from '../prismaClient';
import {
  IStoryRepository,
  IUserRepository,
  IJobRepository,
  ICommentRepository,
  ILikeRepository,
  IFeedbackRepository,
  IArtworkRepository,
} from '../../../domain/repositories';
import {
  Story,
  User,
  Comment,
  Like,
  GenerationJob,
  StoryStatus,
  JobStatus,
  AgentType,
  Feedback,
  Artwork,
  ArtworkReaction,
} from '../../../domain/entities';

// ─── PrismaStoryRepository ───────────────────────────────────────────────────
export class PrismaStoryRepository implements IStoryRepository {
  async create(data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story> {
    return prisma.story.create({ data }) as Promise<Story>;
  }

  async findById(id: string): Promise<Story | null> {
    return prisma.story.findUnique({ where: { id } }) as Promise<Story | null>;
  }

  async findByUserId(userId: string): Promise<Story[]> {
    return prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Story[]>;
  }

  async findAll(): Promise<Story[]> {
    return prisma.story.findMany({
      where: {
        moderationStatus: { not: 'BLOCKED' },
        reports: { lt: 3 }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }) as Promise<Story[]>;
  }

  async update(id: string, data: Partial<Story>): Promise<Story> {
    return prisma.story.update({ where: { id }, data }) as Promise<Story>;
  }

  async delete(id: string): Promise<void> {
    await prisma.story.delete({ where: { id } });
  }

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    return prisma.story.update({ where: { id }, data: { status } }) as Promise<Story>;
  }
}

// ─── PrismaUserRepository ────────────────────────────────────────────────────
export class PrismaUserRepository implements IUserRepository {
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const { likes, ...rest } = data as any;
    return prisma.user.create({ data: rest }) as Promise<User>;
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } }) as Promise<User | null>;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const { likes, ...rest } = data as any;
    return prisma.user.update({ where: { id }, data: rest }) as Promise<User>;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}

// ─── PrismaJobRepository ─────────────────────────────────────────────────────
export class PrismaJobRepository implements IJobRepository {
  async create(data: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<GenerationJob> {
    return prisma.generationJob.create({ data }) as Promise<GenerationJob>;
  }

  async findById(id: string): Promise<GenerationJob | null> {
    return prisma.generationJob.findUnique({ where: { id } }) as Promise<GenerationJob | null>;
  }

  async findByStoryId(storyId: string): Promise<GenerationJob[]> {
    return prisma.generationJob.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<GenerationJob[]>;
  }

  async findByStoryAndAgent(storyId: string, agentType: AgentType): Promise<GenerationJob | null> {
    return prisma.generationJob.findFirst({
      where: { storyId, agentType },
      orderBy: { createdAt: 'desc' },
    }) as Promise<GenerationJob | null>;
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    extra?: { result?: string; error?: string; completedAt?: Date; startedAt?: Date }
  ): Promise<GenerationJob> {
    return prisma.generationJob.update({
      where: { id },
      data: { status, ...extra },
    }) as Promise<GenerationJob>;
  }
}

// ─── PrismaCommentRepository ──────────────────────────────────────────────────
export class PrismaCommentRepository implements ICommentRepository {
  async create(data: { storyId: string; userId: string; content: string }): Promise<Comment> {
    const c = await prisma.comment.create({
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return c as unknown as Comment;
  }

  async findByStoryId(storyId: string): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({
      where: {
        storyId,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return rows as unknown as Comment[];
  }

  async findByUserId(userId: string): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
      },
    });
    return rows as unknown as Comment[];
  }

  async findById(id: string): Promise<Comment | null> {
    const c = await prisma.comment.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return c as unknown as Comment | null;
  }

  async update(id: string, content: string): Promise<Comment> {
    const c = await prisma.comment.update({
      where: { id },
      data: { content },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return c as unknown as Comment;
  }

  async delete(id: string): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  }
}

// ─── PrismaLikeRepository ─────────────────────────────────────────────────────
export class PrismaLikeRepository implements ILikeRepository {
  async create(userId: string, storyId: string): Promise<void> {
    await prisma.like.create({
      data: { userId, storyId },
    });
  }

  async delete(userId: string, storyId: string): Promise<void> {
    await prisma.like.delete({
      where: {
        userId_storyId: { userId, storyId },
      },
    });
  }

  async exists(userId: string, storyId: string): Promise<boolean> {
    const count = await prisma.like.count({
      where: { userId, storyId },
    });
    return count > 0;
  }

  async findByUserId(userId: string): Promise<Story[]> {
    const likes = await prisma.like.findMany({
      where: { userId },
      include: {
        story: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return likes.map((l) => l.story) as unknown as Story[];
  }
}

// ─── PrismaFeedbackRepository ────────────────────────────────────────────────
export class PrismaFeedbackRepository implements IFeedbackRepository {
  async create(data: { userId: string; content: string; rating: number; role: string }): Promise<Feedback> {
    const f = await prisma.feedback.create({
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return f as unknown as Feedback;
  }

  async findAll(): Promise<Feedback[]> {
    const rows = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
      take: 10,
    });
    return rows as unknown as Feedback[];
  }

  async findById(id: string): Promise<Feedback | null> {
    const f = await prisma.feedback.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return f as unknown as Feedback | null;
  }

  async update(id: string, data: { content: string; rating: number; role: string }): Promise<Feedback> {
    const f = await prisma.feedback.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return f as unknown as Feedback;
  }

  async delete(id: string): Promise<void> {
    await prisma.feedback.delete({ where: { id } });
  }
}

// ─── PrismaArtworkRepository ──────────────────────────────────────────────────
export class PrismaArtworkRepository implements IArtworkRepository {
  async create(data: { userId: string; storyId: string; imageUrl: string }): Promise<Artwork> {
    const a = await prisma.artwork.create({
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
        reactions: true,
      },
    });
    return a as unknown as Artwork;
  }

  async findAll(): Promise<Artwork[]> {
    const rows = await prisma.artwork.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
        reactions: true,
      },
    });
    return rows as unknown as Artwork[];
  }

  async findById(id: string): Promise<Artwork | null> {
    const a = await prisma.artwork.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
        reactions: true,
      },
    });
    return a as unknown as Artwork | null;
  }

  async findByStoryAndUser(storyId: string, userId: string): Promise<Artwork | null> {
    const a = await prisma.artwork.findFirst({
      where: { storyId, userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
        reactions: true,
      },
    });
    return a as unknown as Artwork | null;
  }

  async update(id: string, data: { imageUrl: string }): Promise<Artwork> {
    const a = await prisma.artwork.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        story: { select: { id: true, title: true } },
        reactions: true,
      },
    });
    return a as unknown as Artwork;
  }

  async delete(id: string): Promise<void> {
    await prisma.artwork.delete({ where: { id } });
  }

  async toggleReaction(
    artworkId: string,
    userId: string,
    reactionType: string
  ): Promise<{ type: string; count: number; active: boolean }> {
    const existing = await prisma.artworkReaction.findUnique({
      where: {
        artworkId_userId_type: {
          artworkId,
          userId,
          type: reactionType,
        },
      },
    });

    if (existing) {
      await prisma.artworkReaction.delete({
        where: {
          id: existing.id,
        },
      });
      const count = await prisma.artworkReaction.count({
        where: { artworkId, type: reactionType },
      });
      return { type: reactionType, count, active: false };
    } else {
      await prisma.artworkReaction.create({
        data: {
          artworkId,
          userId,
          type: reactionType,
        },
      });
      const count = await prisma.artworkReaction.count({
        where: { artworkId, type: reactionType },
      });
      return { type: reactionType, count, active: true };
    }
  }
}

