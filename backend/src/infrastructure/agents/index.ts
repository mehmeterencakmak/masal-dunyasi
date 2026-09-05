// ─── AGENT İMPLEMENTASYONLARI ───────────────────────────────────────────────
// Her agent bir domain service interface'ini somutlaştırır.
// Infrastructure katmanında olmaları bağımlılıkları domain'den izole eder.

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import {
  IStoryAgentService,
  ITTSAgentService,
  IImageAgentService,
  IMusicAgentService,
  IVideoAgentService,
  IColoringAgentService,
  StoryOutput,
} from '../../domain/services';
import { ElevenLabsClient, ReplicateClient } from '../external/clients';
import { logger } from '../logger';

// ─── Yerel depolama yardımcısı ───────────────────────────────────────────────
async function saveToLocal(buffer: Buffer, filename: string): Promise<string> {
  const uploadDir = process.env.STORAGE_LOCAL_PATH ?? './uploads';
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  const baseUrl = `http://localhost:${process.env.PORT ?? 3001}`;
  return `${baseUrl}/uploads/${filename}`;
}

// ─── 1. STORY AGENT ──────────────────────────────────────────────────────────
// GPT-4o ile kullanıcı promptundan çocuklara uygun masal üretir.
// System prompt yaş grubu, dil ve format kurallarını içerir.
export class StoryAgent implements IStoryAgentService {
  async generate(prompt: string, language = 'tr'): Promise<StoryOutput> {
    const langLabel = language === 'tr' ? 'Türkçe' : 'English';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY bulunamadı — .env dosyasını kontrol edin');
    }

    logger.debug('StoryAgent: Gemini API çağrılıyor', { prompt: prompt.slice(0, 50) });

    const systemInstruction = `Sen yaratıcı ve deneyimli bir çocuk masalı yazarısın. 5-12 yaş grubuna hitap eden, 
eğitici ve sürükleyici masallar yazarsın. Masalların mutlaka:
- Güçlü ve sevimli karakterleri olur
- Ahlaki bir dersi vardır ama bunu dayatmaz, doğal aktarır
- Hayal gücünü canlandıran betimlemeler içerir
- ${langLabel} dilinde yazılır
- Başlık + içerik + kısa özet formatında çıktı üretirsin

Her zaman şu JSON yapısında yanıt ver:
{
  "title": "masal başlığı",
  "content": "3-5 paragraf halinde tam masal metni",
  "summary": "görseller için tek cümlelik sahne tasviri",
  "mood": "magical | adventure | funny | romantic | educational"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: `Bu konu hakkında bir masal yaz: ${prompt}`
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: systemInstruction
            }
          ]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              content: { type: "STRING" },
              summary: { type: "STRING" },
              mood: { type: "STRING" }
            },
            required: ["title", "content", "summary", "mood"]
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(raw) as StoryOutput;

    if (!parsed.title || !parsed.content) {
      throw new Error('StoryAgent geçersiz çıktı döndürdü');
    }

    return parsed;
  }
}

function splitTextIntoChunks(text: string, maxLength: number = 200): string[] {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const sentences = normalizedText.match(/[^.!?]+[.!?]+(\s|$)/g) || [normalizedText];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      if (sentence.length > maxLength) {
        const words = sentence.split(/\s+/);
        let subChunk = "";
        for (const word of words) {
          if ((subChunk + " " + word).length > maxLength) {
            if (subChunk.trim().length > 0) {
              chunks.push(subChunk.trim());
            }
            subChunk = word;
          } else {
            subChunk = subChunk ? subChunk + " " + word : word;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// ─── 2. TTS AGENT ────────────────────────────────────────────────────────────
// ElevenLabs ile hikaye metnini sıcak ve doğal sesle okur.
// Çıktı MP3 olarak kaydedilir, URL döndürülür.
export class TTSAgent implements ITTSAgentService {
  private client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient();
  }

  async generate(text: string, storyId: string): Promise<string> {
    if (!this.client.isConfigured()) {
      logger.warn('ElevenLabs API anahtarı bulunamadı, Google TTS fallback kullanılıyor.', { storyId });
      
      const { prisma } = await import('../database/prismaClient');
      const story = await prisma.story.findUnique({ where: { id: storyId } });
      const language = story?.language || 'tr';
      
      const chunks = splitTextIntoChunks(text, 200);
      const buffers: Buffer[] = [];
      
      for (const chunk of chunks) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        buffers.push(Buffer.from(response.data));
      }
      
      const audioBuffer = Buffer.concat(buffers);
      const filename = `tts_${storyId}_${uuidv4().slice(0, 8)}.mp3`;
      const url = await saveToLocal(audioBuffer, filename);
      return url;
    }

    logger.debug('TTSAgent: ElevenLabs çağrılıyor', { storyId, textLength: text.length });

    // Uzun metinleri ElevenLabs limiti için kısalt (2500 karakter)
    const truncated = text.length > 2500 ? text.slice(0, 2497) + '...' : text;
    const audioBuffer = await this.client.textToSpeech(truncated);

    const filename = `tts_${storyId}_${uuidv4().slice(0, 8)}.mp3`;
    const url = await saveToLocal(audioBuffer, filename);

    return url;
  }
}

// ─── 3. IMAGE AGENT ──────────────────────────────────────────────────────────
// DALL-E 3 ile çocuk kitabı stilinde görsel üretir.
// Prompt engineering: watercolor style, soft colors, child-friendly.
export class ImageAgent implements IImageAgentService {
  async generate(storySummary: string, storyId: string, mood?: string): Promise<string> {
    // Çocuk kitabı görseli için stil yönergeleri
    const styleGuide = 'children\'s book illustration, soft watercolor style, warm pastel colors, gentle and magical, whimsical, age 5-12 appropriate, no text, no letters';
    const moodGuide = mood === 'adventure' ? 'vibrant, adventurous' : 'dreamy, enchanted';

    const imagePrompt = `${styleGuide}, ${moodGuide}. Scene: ${storySummary}`;

    logger.debug('ImageAgent: Pollinations AI çağrılıyor', { storyId, promptLength: imagePrompt.length });

    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data);
    const filename = `image_${storyId}_${uuidv4().slice(0, 8)}.png`;

    return await saveToLocal(buffer, filename);
  }
}

// ─── 4. MUSIC AGENT ──────────────────────────────────────────────────────────
// Replicate MusicGen ile hikayenin tonuna uygun 30 saniyelik müzik üretir.
// Asenkron polling ile tamamlanma beklenir.
export class MusicAgent implements IMusicAgentService {
  private client: ReplicateClient;

  constructor() {
    this.client = new ReplicateClient();
  }

  async generate(storyMood: string, storyId: string): Promise<string> {
    if (!this.client.isConfigured()) {
      logger.warn('Replicate API anahtarı bulunamadı, SoundHelix fallback kullanılıyor.', { storyId, mood: storyMood });
      
      const moodUrls: Record<string, string> = {
        magical: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        adventure: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        funny: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        romantic: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        educational: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      };
      
      const musicUrl = moodUrls[storyMood] ?? moodUrls['magical'];
      
      // Download the music loop
      const musicResponse = await axios.get(musicUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(musicResponse.data);
      const filename = `music_${storyId}_${uuidv4().slice(0, 8)}.mp3`;
      
      return await saveToLocal(buffer, filename);
    }

    // Hikaye tonuna göre müzik prompt'u oluştur
    const moodPrompts: Record<string, string> = {
      magical: "children's fairy tale, magical piano melody, soft orchestral, enchanting, 30 seconds",
      adventure: "children's adventure theme, upbeat orchestral, heroic, exciting, 30 seconds",
      funny: "playful children's music, lighthearted, happy xylophone and strings, 30 seconds",
      romantic: "gentle lullaby, soft piano, warm strings, peaceful, 30 seconds",
      educational: "calm background music, curious and wonder-filled, light piano, 30 seconds",
    };

    const musicPrompt = moodPrompts[storyMood] ?? moodPrompts['magical'];

    logger.debug('MusicAgent: Replicate MusicGen çağrılıyor', { storyId, mood: storyMood });

    // MusicGen-large modeli kullan
    const predictionId = await this.client.createPrediction(
      'meta/musicgen',
      {
        prompt: musicPrompt,
        model_version: 'large',
        output_format: 'mp3',
        normalization_strategy: 'peak',
        duration: 30,
      }
    );

    // Tamamlanana kadar polling yap (maks 2 dakika)
    const musicUrl = await this.client.waitForPrediction(predictionId, 120000);

    // Müziği indir ve kaydet
    const musicResponse = await axios.get(musicUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(musicResponse.data);
    const filename = `music_${storyId}_${uuidv4().slice(0, 8)}.mp3`;

    return await saveToLocal(buffer, filename);
  }
}

// ─── 5. VIDEO AGENT ──────────────────────────────────────────────────────────
// Stable Video Diffusion ile ImageAgent çıktısından kısa video üretir.
// Input: statik görsel → Output: 3-5 saniyelik MP4 animasyonu
export class VideoAgent implements IVideoAgentService {
  private client: ReplicateClient;

  constructor() {
    this.client = new ReplicateClient();
  }

  async generate(imageUrl: string, storyId: string): Promise<string> {
    if (!this.client.isConfigured()) {
      logger.warn('Replicate API anahtarı bulunamadı, Mixkit video loop fallback kullanılıyor.', { storyId });
      
      const { prisma } = await import('../database/prismaClient');
      const story = await prisma.story.findUnique({ where: { id: storyId } });
      const storyMood = story?.mood || 'magical';
      
      const moodVideos: Record<string, string> = {
        magical: "https://assets.mixkit.co/videos/preview/mixkit-spinning-glowing-dots-of-light-loop-42866-large.mp4",
        adventure: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-loop-4623-large.mp4",
        funny: "https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-warm-particles-background-loop-42939-large.mp4",
        romantic: "https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-warm-particles-background-loop-42939-large.mp4",
        educational: "https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-warm-particles-background-loop-42939-large.mp4",
      };
      
      const videoUrl = moodVideos[storyMood] ?? moodVideos['magical'];
      
      // Download the loop video
      let videoResponse;
      try {
        videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
      } catch (err: any) {
        logger.warn('Mixkit video indirme hatası, yedek w3schools videosu indiriliyor.', { error: err.message });
        const fallbackVideo = "https://www.w3schools.com/html/mov_bbb.mp4";
        videoResponse = await axios.get(fallbackVideo, { responseType: 'arraybuffer' });
      }
      
      const buffer = Buffer.from(videoResponse.data);
      const filename = `video_${storyId}_${uuidv4().slice(0, 8)}.mp4`;
      
      return await saveToLocal(buffer, filename);
    }

    logger.debug('VideoAgent: Stable Video Diffusion çağrılıyor', { storyId });

    // stable-video-diffusion modeli: statik görseli canlandırır
    const predictionId = await this.client.createPrediction(
      'stability-ai/stable-video-diffusion',
      {
        input_image: imageUrl,
        video_length: 'short',     // 14-25 frame
        sizing_strategy: 'maintain_aspect_ratio',
        frames_per_second: 6,
        motion_bucket_id: 127,     // Hareket yoğunluğu (0-255)
        cond_aug: 0.02,
      }
    );

    // Video üretimi uzun sürebilir — maks 3 dakika bekle
    const videoUrl = await this.client.waitForPrediction(predictionId, 180000);

    // Videoyu indir ve kaydet
    const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(videoResponse.data);
    const filename = `video_${storyId}_${uuidv4().slice(0, 8)}.mp4`;

    return await saveToLocal(buffer, filename);
  }
}

// ─── 6. COLORING AGENT ───────────────────────────────────────────────────────
// Pollinations AI ile temiz siyah-beyaz boyama sayfası üretir.
export class ColoringAgent implements IColoringAgentService {
  async generate(storySummary: string, storyId: string): Promise<string> {
    const coloringPrompt = `black and white coloring page outline, line-art, coloring book style, clean thick black lines, no shading, no background gradient, white background, child-friendly. Scene: ${storySummary}`;

    logger.debug('ColoringAgent: Pollinations AI çağrılıyor', { storyId, promptLength: coloringPrompt.length });

    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(coloringPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data);
    const filename = `coloring_${storyId}_${uuidv4().slice(0, 8)}.png`;

    return await saveToLocal(buffer, filename);
  }
}

