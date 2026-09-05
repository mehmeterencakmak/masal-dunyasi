// ─── EXTERNAL API CLIENT'LARI ────────────────────────────────────────────────
// 3. parti servisler için sarmalayıcılar. Agent'lar bu client'ları kullanır,
// doğrudan API'lara erişmez. Böylece sağlayıcı değişikliği kolay olur.

import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '../logger';

// ─── OpenAI Client ────────────────────────────────────────────────────────────
// PRISMA CLIENT benzeri singleton — tek instance tüm uygulama boyunca kullanılır
class OpenAIClientSingleton {
  private static instance: OpenAI | null = null;

  static get(): OpenAI {
    if (!this.instance) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY eksik — .env dosyasını kontrol edin');
      }
      this.instance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.instance;
  }
}

export const openaiClient = OpenAIClientSingleton;

// ─── ElevenLabs Client ────────────────────────────────────────────────────────
export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    if (!process.env.ELEVENLABS_API_KEY) {
      logger.warn('ELEVENLABS_API_KEY eksik — TTS agent devre dışı');
    }
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API anahtarı bulunamadı — .env dosyasını kontrol edin');
    }

    const voice = voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

    const response = await axios.post(
      `${this.baseUrl}/text-to-speech/${voice}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }
}

// ─── Replicate Client ────────────────────────────────────────────────────────
// Müzik, video ve alternatif görsel modelleri için
export class ReplicateClient {
  private token: string;
  private baseUrl = 'https://api.replicate.com/v1';

  constructor() {
    if (!process.env.REPLICATE_API_TOKEN) {
      logger.warn('REPLICATE_API_TOKEN eksik — Müzik ve Video agentları devre dışı');
    }
    this.token = process.env.REPLICATE_API_TOKEN ?? '';
  }

  isConfigured(): boolean {
    return this.token.length > 0;
  }

  // Prediction başlat
  async createPrediction(model: string, input: Record<string, unknown>): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Replicate API anahtarı bulunamadı — .env dosyasını kontrol edin');
    }

    const response = await axios.post(
      `${this.baseUrl}/models/${model}/predictions`,
      { input },
      { headers: { Authorization: `Token ${this.token}`, 'Content-Type': 'application/json' } }
    );

    return response.data.id as string;
  }

  // Prediction tamamlanana kadar bekle (polling)
  async waitForPrediction(predictionId: string, maxWaitMs = 120000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 saniyede bir sorgula

    while (Date.now() - startTime < maxWaitMs) {
      const response = await axios.get(
        `${this.baseUrl}/predictions/${predictionId}`,
        { headers: { Authorization: `Token ${this.token}` } }
      );

      const { status, output, error } = response.data;

      if (status === 'succeeded') {
        const url = Array.isArray(output) ? output[0] : output;
        return url as string;
      }

      if (status === 'failed' || status === 'canceled') {
        throw new Error(`Replicate prediction başarısız: ${error ?? 'Bilinmeyen hata'}`);
      }

      // QUEUED veya PROCESSING — beklemeye devam et
      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Replicate prediction zaman aşımına uğradı');
  }
}
