// ─── DOMAIN ENTITY: Story ───────────────────────────────────────────────────
// Saf iş mantığı nesnesi — veritabanından bağımsız

export type StoryStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AgentType = 'STORY' | 'TTS' | 'IMAGE' | 'MUSIC' | 'VIDEO' | 'COLORING';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Story {
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
  status: StoryStatus;
  createdAt: Date;
  updatedAt: Date;
  views?: number;
  likes?: number;
  likesThumbsUp?: number;
  likesStars?: number;
  commentsCount?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  password: string;
  role?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  likes?: Like[];
}

export interface Comment {
  id: string;
  storyId: string;
  userId: string;
  content: string;
  createdAt: Date;
  // joined fields
  user?: { id: string; name?: string; email: string };
  story?: { id: string; title?: string };
}

export interface Like {
  id: string;
  storyId: string;
  userId: string;
  createdAt: Date;
  user?: User;
  story?: Story;
}

// ─── DOMAIN ENTITY: GenerationJob ───────────────────────────────────────────
// Her agent tetiklemesi bir iş kaydı oluşturur — durum takibi için

export interface GenerationJob {
  id: string;
  storyId: string;
  agentType: AgentType;
  status: JobStatus;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  userId: string;
  content: string;
  rating: number;
  role: string;
  createdAt: Date;
  user?: { id: string; name?: string; email: string };
}

export interface Artwork {
  id: string;
  userId: string;
  storyId: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; name?: string | null; email: string };
  story?: { id: string; title?: string | null };
  reactions?: ArtworkReaction[];
}

export interface ArtworkReaction {
  id: string;
  artworkId: string;
  userId: string;
  type: string;
  createdAt: Date;
  user?: { id: string; name?: string | null; email: string };
}
