// ─── API SERVİS — Backend ile iletişim ────────────────────────────
// Tüm HTTP çağrıları bu dosyada toplanır

const BASE_URL = 'http://localhost:3001'

// ─── Tipler ───────────────────────────────────────────────────────
export type StoryStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type AgentType = 'STORY' | 'TTS' | 'IMAGE' | 'MUSIC' | 'VIDEO' | 'COLORING'
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface Story {
  id: string
  userId?: string
  prompt: string
  title?: string
  content: string
  summary?: string
  mood?: string
  language: string
  audioUrl?: string
  imageUrl?: string
  musicUrl?: string
  videoUrl?: string
  coloringUrl?: string
  status: StoryStatus
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  likesThumbsUp: number
  likesStars: number
  commentsCount: number
  jobs?: Job[]
}

export interface Job {
  id: string
  agentType: AgentType
  status: JobStatus
  error?: string
  completedAt?: string
  result?: { url?: string }
}

export interface Comment {
  id: string
  storyId: string
  userId: string
  content: string
  createdAt: string
  user?: { id: string; name?: string; email: string }
  story?: { id: string; title?: string }
}

export interface Feedback {
  id: string
  userId: string
  content: string
  rating: number
  role: string
  createdAt: string
  user?: { id: string; name?: string; email: string }
}

// ─── HTTP yardımcısı ──────────────────────────────────────────────
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('masal-dunyasi:token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Sunucu hatası' }))
    throw new Error(err.error ?? `HTTP ${response.status}`)
  }

  // 204 No Content
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// ─── Story API ────────────────────────────────────────────────────
export const storyApi = {
  generate: (prompt: string, language = 'tr') =>
    apiFetch<Story>('/api/stories/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, language }),
    }),

  getById: (id: string) => apiFetch<Story>(`/api/stories/${id}`),

  getAll: () => apiFetch<Story[]>('/api/stories'),

  delete: (id: string) =>
    apiFetch<void>(`/api/stories/${id}`, { method: 'DELETE' }),

  like: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/like`, { method: 'POST' }),

  unlike: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/unlike`, { method: 'POST' }),

  likeThumbsUp: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/like-thumbsup`, { method: 'POST' }),

  unlikeThumbsUp: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/unlike-thumbsup`, { method: 'POST' }),

  likeStars: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/like-stars`, { method: 'POST' }),

  unlikeStars: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/unlike-stars`, { method: 'POST' }),

  incrementViews: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/view`, { method: 'POST' }),

  comment: (id: string) =>
    apiFetch<Story>(`/api/stories/${id}/comment`, { method: 'POST' }),

  getComments: (storyId: string) =>
    apiFetch<Comment[]>(`/api/stories/${storyId}/comments`),

  addComment: (storyId: string, content: string) =>
    apiFetch<Comment>(`/api/stories/${storyId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (storyId: string, commentId: string) =>
    apiFetch<void>(`/api/stories/${storyId}/comments/${commentId}`, { method: 'DELETE' }),

  updateComment: (storyId: string, commentId: string, content: string) =>
    apiFetch<Comment>(`/api/stories/${storyId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  reportStory: (storyId: string) =>
    apiFetch<{ message: string; reports: number }>(`/api/stories/${storyId}/report`, { method: 'POST' }),

  reportComment: (storyId: string, commentId: string) =>
    apiFetch<{ message: string; reports: number }>(`/api/stories/${storyId}/comments/${commentId}/report`, { method: 'POST' }),

  removeImage: (storyId: string) =>
    apiFetch<Story>(`/api/stories/${storyId}/remove-image`, { method: 'PATCH' }),

  chat: (storyId: string, message: string, character: 'owl' | 'dragon', history: { role: 'user' | 'assistant'; content: string }[]) =>
    apiFetch<{ reply: string }>(`/api/stories/${storyId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, character, history }),
    }),
}

// ─── Agent API ────────────────────────────────────────────────────
export const agentApi = {
  generateTTS: (storyId: string) =>
    apiFetch<{ url: string; agentType: string }>(`/api/agents/tts/${storyId}`, { method: 'POST' }),

  generateImage: (storyId: string) =>
    apiFetch<{ url: string; agentType: string }>(`/api/agents/image/${storyId}`, { method: 'POST' }),

  generateMusic: (storyId: string) =>
    apiFetch<{ url: string; agentType: string }>(`/api/agents/music/${storyId}`, { method: 'POST' }),

  generateVideo: (storyId: string) =>
    apiFetch<{ url: string; agentType: string }>(`/api/agents/video/${storyId}`, { method: 'POST' }),

  generateColoring: (storyId: string) =>
    apiFetch<{ url: string; agentType: string }>(`/api/agents/coloring/${storyId}`, { method: 'POST' }),
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  role?: string;
  status?: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () => apiFetch<UserInfo>('/api/auth/me'),

  guestLogin: () =>
    apiFetch<AuthResponse>('/api/auth/guest', {
      method: 'POST',
    }),
}

// ─── User API ─────────────────────────────────────────────────────
export const userApi = {
  getMyStories: () => apiFetch<Story[]>('/api/users/me/stories'),
  getMyComments: () => apiFetch<Comment[]>('/api/users/me/comments'),
  getMyLikes: () => apiFetch<Story[]>('/api/users/me/likes'),
  updateProfile: (name: string) =>
    apiFetch<{ id: string; email: string; name?: string }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('/api/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// ─── Health ───────────────────────────────────────────────────────
export const healthApi = {
  check: () =>
    apiFetch<{ status: string; agents: Record<string, boolean> }>('/health'),
}

// ─── Feedback API ──────────────────────────────────────────────────
export const feedbackApi = {
  getAll: () => apiFetch<Feedback[]>('/api/feedbacks'),
  create: (content: string, rating: number, role: string) =>
    apiFetch<Feedback>('/api/feedbacks', {
      method: 'POST',
      body: JSON.stringify({ content, rating, role }),
    }),
  update: (id: string, content: string, rating: number, role: string) =>
    apiFetch<Feedback>(`/api/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, rating, role }),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/feedbacks/${id}`, {
      method: 'DELETE',
    }),
}

// ─── Admin API ────────────────────────────────────────────────────
export const adminApi = {
  becomeAdmin: (adminUsername: string, adminPassword: string) =>
    apiFetch<{ token: string; message: string; user: UserInfo }>('/api/admin/become-admin', {
      method: 'POST',
      body: JSON.stringify({ adminUsername, adminPassword }),
    }),
  getUsers: () => apiFetch<any[]>('/api/admin/users'),
  toggleBlockUser: (id: string) =>
    apiFetch<{ message: string; user: any }>(`/api/admin/users/${id}/block`, {
      method: 'PUT',
    }),
  deleteUser: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getStories: () => apiFetch<any[]>('/api/admin/stories'),
  updateStory: (id: string, title?: string, content?: string, summary?: string) =>
    apiFetch<any>(`/api/admin/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, summary }),
    }),
  deleteStory: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/stories/${id}`, {
      method: 'DELETE',
    }),
  getComments: () => apiFetch<any[]>('/api/admin/comments'),
  deleteComment: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}`, {
      method: 'DELETE',
    }),
  approveStory: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/stories/${id}/approve`, {
      method: 'POST',
    }),
  blockStory: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/stories/${id}/block`, {
      method: 'POST',
    }),
  approveComment: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}/approve`, {
      method: 'POST',
    }),
  blockComment: (id: string) =>
    apiFetch<{ message: string }>(`/api/admin/comments/${id}/block`, {
      method: 'POST',
    }),
}

// ─── Artwork / Galeri API ──────────────────────────────────────────
export interface Artwork {
  id: string
  userId: string
  storyId: string
  imageUrl: string
  createdAt: string
  updatedAt: string
  user?: { id: string; name?: string; email: string }
  story?: { id: string; title?: string }
  reactions?: ArtworkReaction[]
}

export interface ArtworkReaction {
  id: string
  artworkId: string
  userId: string
  type: 'LIKE' | 'HEART' | 'STAR' | 'CLAP'
  createdAt: string
}

export const artworkApi = {
  getAll: () => apiFetch<Artwork[]>('/api/artworks'),
  getById: (id: string) => apiFetch<Artwork>(`/api/artworks/${id}`),
  create: (storyId: string, image: string) =>
    apiFetch<Artwork>('/api/artworks', {
      method: 'POST',
      body: JSON.stringify({ storyId, image }),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/artworks/${id}`, {
      method: 'DELETE',
    }),
  react: (id: string, type: 'LIKE' | 'HEART' | 'STAR' | 'CLAP') =>
    apiFetch<{ type: string; count: number; active: boolean }>(`/api/artworks/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
}
