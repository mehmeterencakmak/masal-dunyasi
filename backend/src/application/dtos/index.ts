// ─── DATA TRANSFER OBJECT'LER ───────────────────────────────────────────────
// Controller ile Use Case arasında taşınan veri yapıları.
// Validasyon kuralları Zod ile presentation katmanında uygulanır.

import { Story, GenerationJob, JobStatus } from '../../domain/entities';

// ─── İstek DTO'ları ──────────────────────────────────────────────────────────

export interface StoryRequestDTO {
  prompt: string;           // min:10, max:500 karakter
  language?: string;        // 'tr' | 'en' — varsayılan: 'tr'
  userId?: string;          // opsiyonel — oturum açmış kullanıcı
}

export interface AgentRequestDTO {
  storyId: string;
}

export interface RegisterDTO {
  email: string;
  name?: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// ─── Yanıt DTO'ları ──────────────────────────────────────────────────────────

export interface StoryResponseDTO {
  id: string;
  userId?: string;
  prompt: string;
  title?: string;
  content: string;
  summary?: string;
  mood?: string;
  language: string;
  audioUrl?: string;
  imageUrl?: string;
  musicUrl?: string;
  videoUrl?: string;
  coloringUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  likesThumbsUp: number;
  likesStars: number;
  commentsCount: number;
  jobs?: JobStatusDTO[];
}

export interface JobStatusDTO {
  id: string;
  agentType: string;
  status: JobStatus;
  error?: string;
  completedAt?: string;
}

export interface AuthResponseDTO {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

// ─── Yardımcı dönüşüm fonksiyonu ────────────────────────────────────────────
// Story entity'sini HTTP yanıt formatına dönüştürür

export function toStoryResponseDTO(story: Story, jobs?: GenerationJob[]): StoryResponseDTO {
  return {
    id: story.id,
    userId: story.userId,
    prompt: story.prompt,
    title: story.title,
    content: story.content,
    summary: story.summary,
    mood: story.mood,
    language: story.language,
    audioUrl: story.audioUrl,
    imageUrl: story.imageUrl,
    musicUrl: story.musicUrl,
    videoUrl: story.videoUrl,
    coloringUrl: story.coloringUrl,
    status: story.status,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
    views: story.views || 0,
    likes: story.likes || 0,
    likesThumbsUp: story.likesThumbsUp || 0,
    likesStars: story.likesStars || 0,
    commentsCount: story.commentsCount || 0,
    jobs: jobs?.map(j => ({
      id: j.id,
      agentType: j.agentType,
      status: j.status,
      error: j.error,
      completedAt: j.completedAt?.toISOString(),
    })),
  };
}
