// ─── AGENT SERVİS INTERFACE'LERİ ────────────────────────────────────────────
// Her agent için bağımsız sözleşme — farklı sağlayıcılarla değiştirilebilir

// ─── StoryAgent çıktı tipi ───────────────────────────────────────────────────
export interface StoryOutput {
  title: string;
  content: string;
  summary: string;
  mood: 'magical' | 'adventure' | 'funny' | 'romantic' | 'educational';
}

// ─── IStoryAgentService ──────────────────────────────────────────────────────
// OpenAI GPT-4o ile masal üretir
export interface IStoryAgentService {
  generate(prompt: string, language?: string): Promise<StoryOutput>;
}

// ─── ITTSAgentService ────────────────────────────────────────────────────────
// ElevenLabs ile metni sese dönüştürür
export interface ITTSAgentService {
  generate(text: string, storyId: string): Promise<string>; // döndürür: audioUrl
}

// ─── IImageAgentService ──────────────────────────────────────────────────────
// DALL-E 3 veya Stable Diffusion ile görsel üretir
export interface IImageAgentService {
  generate(storySummary: string, storyId: string, mood?: string): Promise<string>; // döndürür: imageUrl
}

// ─── IMusicAgentService ──────────────────────────────────────────────────────
// Replicate MusicGen ile arkaplan müziği üretir
export interface IMusicAgentService {
  generate(storyMood: string, storyId: string): Promise<string>; // döndürür: musicUrl
}

// ─── IVideoAgentService ──────────────────────────────────────────────────────
// Stable Video Diffusion ile görselden video üretir
export interface IVideoAgentService {
  generate(imageUrl: string, storyId: string): Promise<string>; // döndürür: videoUrl
}

// ─── IColoringAgentService ───────────────────────────────────────────────────
// Pollinations AI ile boyama sayfası outline (line-art) görseli üretir
export interface IColoringAgentService {
  generate(storySummary: string, storyId: string): Promise<string>; // döndürür: coloringUrl
}

// ─── IStorageService ─────────────────────────────────────────────────────────
// Dosya depolama soyutlaması — local veya S3
export interface IStorageService {
  save(buffer: Buffer, filename: string, mimetype: string): Promise<string>;
  getUrl(filename: string): string;
  delete(filename: string): Promise<void>;
}
