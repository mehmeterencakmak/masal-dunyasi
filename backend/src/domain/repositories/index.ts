// ─── REPOSITORY INTERFACE'LERİ ──────────────────────────────────────────────
// Domain katmanı veritabanından tamamen habersizdir.
// Somut implementasyonlar (Prisma) infrastructure katmanındadır.

import { Story, GenerationJob, User, Comment, Like, StoryStatus, JobStatus, AgentType, Feedback, Artwork, ArtworkReaction } from '../entities';

// ─── IStoryRepository ────────────────────────────────────────────────────────
export interface IStoryRepository {
  create(data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story>;
  findById(id: string): Promise<Story | null>;
  findByUserId(userId: string): Promise<Story[]>;
  findAll(): Promise<Story[]>;
  update(id: string, data: Partial<Story>): Promise<Story>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: StoryStatus): Promise<Story>;
}

// ─── IUserRepository ────────────────────────────────────────────────────────
export interface IUserRepository {
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

// ─── ICommentRepository ──────────────────────────────────────────────────────
export interface ICommentRepository {
  create(data: { storyId: string; userId: string; content: string }): Promise<Comment>;
  findByStoryId(storyId: string): Promise<Comment[]>;
  findByUserId(userId: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  update(id: string, content: string): Promise<Comment>;
  delete(id: string): Promise<void>;
}

// ─── IJobRepository ─────────────────────────────────────────────────────────
export interface IJobRepository {
  create(data: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<GenerationJob>;
  findById(id: string): Promise<GenerationJob | null>;
  findByStoryId(storyId: string): Promise<GenerationJob[]>;
  findByStoryAndAgent(storyId: string, agentType: AgentType): Promise<GenerationJob | null>;
  updateStatus(id: string, status: JobStatus, extra?: { result?: string; error?: string; completedAt?: Date; startedAt?: Date }): Promise<GenerationJob>;
}

// ─── ILikeRepository ─────────────────────────────────────────────────────────
export interface ILikeRepository {
  create(userId: string, storyId: string): Promise<void>;
  delete(userId: string, storyId: string): Promise<void>;
  exists(userId: string, storyId: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Story[]>;
}

// ─── IFeedbackRepository ─────────────────────────────────────────────────────
export interface IFeedbackRepository {
  create(data: { userId: string; content: string; rating: number; role: string }): Promise<Feedback>;
  findAll(): Promise<Feedback[]>;
  findById(id: string): Promise<Feedback | null>;
  update(id: string, data: { content: string; rating: number; role: string }): Promise<Feedback>;
  delete(id: string): Promise<void>;
}

// ─── IArtworkRepository ─────────────────────────────────────────────────────
export interface IArtworkRepository {
  create(data: { userId: string; storyId: string; imageUrl: string }): Promise<Artwork>;
  findAll(): Promise<Artwork[]>;
  findById(id: string): Promise<Artwork | null>;
  findByStoryAndUser(storyId: string, userId: string): Promise<Artwork | null>;
  update(id: string, data: { imageUrl: string }): Promise<Artwork>;
  delete(id: string): Promise<void>;
  toggleReaction(artworkId: string, userId: string, reactionType: string): Promise<{ type: string; count: number; active: boolean }>;
}
