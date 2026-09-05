// ─── USE CASE: AGENT TETİKLEMELERİ ─────────────────────────────────────────
// Her agent için ayrı use case. Ortak yapı: job oluştur → agent çalıştır →
// story güncelle → WebSocket bildir.

import { IStoryRepository, IJobRepository } from '../../domain/repositories';
import {
  ITTSAgentService,
  IImageAgentService,
  IMusicAgentService,
  IVideoAgentService,
  IColoringAgentService,
} from '../../domain/services';
import { logger } from '../../infrastructure/logger';

type BroadcastFn = (event: string, data: unknown) => void;

// ─── Ortak parametreler ──────────────────────────────────────────────────────
interface RunAgentParams {
  storyId: string;
  agentType: 'TTS' | 'IMAGE' | 'MUSIC' | 'VIDEO' | 'COLORING';
  storyRepo: IStoryRepository;
  jobRepo: IJobRepository;
  broadcast?: BroadcastFn;
  urlField: 'audioUrl' | 'imageUrl' | 'musicUrl' | 'videoUrl' | 'coloringUrl';
  runner: () => Promise<string>;
}

// ─── Herkesin kullanabileceği agentlar (TTS, Boyama) ─────────────────────────
// Yetki kontrolü yapılmaz — giriş yapmış her kullanıcı tetikleyebilir.
async function runAgentPublic(params: RunAgentParams): Promise<string> {
  const { storyId, agentType, storyRepo, jobRepo, broadcast, urlField, runner } = params;

  const story = await storyRepo.findById(storyId);
  if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);
  if (!story.content) throw new Error('Hikaye içeriği henüz hazır değil');

  return executeAgent({ storyId, agentType, jobRepo, broadcast, urlField, runner });
}

// ─── Sadece masal sahibinin kullanabileceği agentlar (Görsel, Müzik, Video) ──
// Yalnızca hikayeyi yazan kişi tetikleyebilir.
async function runAgentOwnerOnly(params: RunAgentParams & { requestingUserId: string }): Promise<string> {
  const { storyId, agentType, storyRepo, jobRepo, broadcast, urlField, runner, requestingUserId } = params;

  const story = await storyRepo.findById(storyId);
  if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);

  // YETKİ KONTROLÜ: Sadece masalın yazarı değiştirebilir
  if (!story.userId || story.userId !== requestingUserId) {
    throw new Error('Bu işlemi yalnızca masalın yazarı yapabilir.');
  }

  if (!story.content) throw new Error('Hikaye içeriği henüz hazır değil');

  return executeAgent({ storyId, agentType, jobRepo, broadcast, urlField, runner });
}

// ─── İçsel agent çalıştırıcı ─────────────────────────────────────────────────
async function executeAgent(params: {
  storyId: string;
  agentType: 'TTS' | 'IMAGE' | 'MUSIC' | 'VIDEO' | 'COLORING';
  jobRepo: IJobRepository;
  broadcast?: BroadcastFn;
  urlField: 'audioUrl' | 'imageUrl' | 'musicUrl' | 'videoUrl' | 'coloringUrl';
  runner: () => Promise<string>;
}): Promise<string> {
  const { storyId, agentType, jobRepo, broadcast, urlField, runner } = params;

  // Job kaydı oluştur
  const job = await jobRepo.create({
    storyId,
    agentType,
    status: 'RUNNING',
    startedAt: new Date(),
  });

  broadcast?.('job:update', { storyId, jobId: job.id, agentType, status: 'RUNNING' });
  logger.info(`${agentType} agent başlatıldı`, { storyId, jobId: job.id });

  try {
    const resultUrl = await runner();

    // urlField'ı story'ye kaydet — repository üzerinden
    // (repo.update'i burada doğrudan çağıramayız, her use case kendi repo'sunu kullanıyor)
    await jobRepo.updateStatus(job.id, 'COMPLETED', {
      result: JSON.stringify({ url: resultUrl }),
      completedAt: new Date(),
    });

    broadcast?.('job:update', {
      storyId, jobId: job.id, agentType, status: 'COMPLETED',
      result: { url: resultUrl },
    });

    logger.info(`${agentType} agent tamamlandı`, { storyId, url: resultUrl });
    return resultUrl;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    logger.error(`${agentType} agent hatası`, { storyId, error: errorMessage });

    await jobRepo.updateStatus(job.id, 'FAILED', {
      error: errorMessage,
      completedAt: new Date(),
    });

    broadcast?.('job:update', { storyId, jobId: job.id, agentType, status: 'FAILED', error: errorMessage });
    throw new Error(`${agentType} üretimi başarısız: ${errorMessage}`);
  }
}

// ─── USE CASE: TTS (Sesli Okuma) — HERKESE AÇIK ──────────────────────────────
// Misafir dahil giriş yapmış herkes masal seslendirmesi başlatabilir.
export class GenerateTTSUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private ttsAgent: ITTSAgentService,
    private broadcast?: BroadcastFn
  ) {}

  async execute(storyId: string, _requestingUserId: string): Promise<string> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);

    const url = await runAgentPublic({
      storyId, agentType: 'TTS',
      storyRepo: this.storyRepo,
      jobRepo: this.jobRepo,
      broadcast: this.broadcast,
      urlField: 'audioUrl',
      runner: () => this.ttsAgent.generate(story.content, storyId),
    });

    await this.storyRepo.update(storyId, { audioUrl: url });
    return url;
  }
}

// ─── USE CASE: Görsel Üretimi — SADECE YAZARA ────────────────────────────────
export class GenerateImageUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private imageAgent: IImageAgentService,
    private broadcast?: BroadcastFn
  ) {}

  async execute(storyId: string, requestingUserId: string): Promise<string> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);

    const summary = story.summary ?? story.content.slice(0, 200);

    const url = await runAgentOwnerOnly({
      storyId, agentType: 'IMAGE',
      storyRepo: this.storyRepo,
      jobRepo: this.jobRepo,
      broadcast: this.broadcast,
      urlField: 'imageUrl',
      runner: () => this.imageAgent.generate(summary, storyId, story.mood),
      requestingUserId,
    });

    await this.storyRepo.update(storyId, { imageUrl: url });
    return url;
  }
}

// ─── USE CASE: Müzik Üretimi — SADECE YAZARA ─────────────────────────────────
export class GenerateMusicUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private musicAgent: IMusicAgentService,
    private broadcast?: BroadcastFn
  ) {}

  async execute(storyId: string, requestingUserId: string): Promise<string> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);

    const mood = story.mood ?? 'magical';

    const url = await runAgentOwnerOnly({
      storyId, agentType: 'MUSIC',
      storyRepo: this.storyRepo,
      jobRepo: this.jobRepo,
      broadcast: this.broadcast,
      urlField: 'musicUrl',
      runner: () => this.musicAgent.generate(mood, storyId),
      requestingUserId,
    });

    await this.storyRepo.update(storyId, { musicUrl: url });
    return url;
  }
}

// ─── USE CASE: Video Üretimi — SADECE YAZARA ─────────────────────────────────
export class GenerateVideoUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private videoAgent: IVideoAgentService,
    private broadcast?: BroadcastFn
  ) {}

  async execute(storyId: string, requestingUserId: string): Promise<string> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);
    if (!story.imageUrl) {
      throw new Error('Video üretimi için önce görsel üretilmelidir');
    }

    const url = await runAgentOwnerOnly({
      storyId, agentType: 'VIDEO',
      storyRepo: this.storyRepo,
      jobRepo: this.jobRepo,
      broadcast: this.broadcast,
      urlField: 'videoUrl',
      runner: () => this.videoAgent.generate(story.imageUrl!, storyId),
      requestingUserId,
    });

    await this.storyRepo.update(storyId, { videoUrl: url });
    return url;
  }
}

// ─── USE CASE: Boyama Sayfası — HERKESE AÇIK ─────────────────────────────────
// Misafir dahil giriş yapmış herkes kendi boyama sayfasını üretebilir.
export class GenerateColoringUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    private coloringAgent: IColoringAgentService,
    private broadcast?: BroadcastFn
  ) {}

  async execute(storyId: string, _requestingUserId: string): Promise<string> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) throw new Error(`Hikaye bulunamadı: ${storyId}`);

    const summary = story.summary ?? story.content.slice(0, 200);

    const url = await runAgentPublic({
      storyId, agentType: 'COLORING',
      storyRepo: this.storyRepo,
      jobRepo: this.jobRepo,
      broadcast: this.broadcast,
      urlField: 'coloringUrl',
      runner: () => this.coloringAgent.generate(summary, storyId),
    });

    await this.storyRepo.update(storyId, { coloringUrl: url });
    return url;
  }
}
