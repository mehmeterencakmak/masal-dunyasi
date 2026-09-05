// ─── USE CASE: HİKAYE OLUŞTURMA ─────────────────────────────────────────────
// İş mantığı burada yönetilir — controller sadece HTTP katmanıdır.
// Bu use case şu adımları gerçekleştirir:
//   1. Prompt doğrulama
//   2. Story kaydı oluşturma (PENDING)
//   3. StoryAgent tetikleme
//   4. Story güncelleme (COMPLETED veya FAILED)
//   5. WebSocket ile frontend'e bildirim gönderme

import { v4 as uuidv4 } from 'uuid';
import { IStoryRepository, IJobRepository } from '../../domain/repositories';
import { IStoryAgentService } from '../../domain/services';
import { StoryRequestDTO, StoryResponseDTO, toStoryResponseDTO } from '../dtos';
import { logger } from '../../infrastructure/logger';

export class GenerateStoryUseCase {
  constructor(
    // REPOSITORY: Veritabanı işlemleri soyutlanmış, domain katmanı DB'den habersiz
    private storyRepo: IStoryRepository,
    private jobRepo: IJobRepository,
    // AGENT BAŞLATMA: Her agent instance'ı dependency injection ile alınır
    private storyAgent: IStoryAgentService,
    // WebSocket broadcast fonksiyonu — opsiyonel
    private broadcast?: (event: string, data: unknown) => void
  ) {}

  async execute(dto: StoryRequestDTO): Promise<StoryResponseDTO> {
    const storyId = uuidv4();
    const language = dto.language ?? 'tr';

    logger.info('GenerateStoryUseCase başlatıldı', { storyId, prompt: dto.prompt });

    // ─── ADIM 1: Boş story kaydı oluştur (içerik henüz yok) ────────────────
    const story = await this.storyRepo.create({
      userId: dto.userId,
      prompt: dto.prompt,
      content: '',
      language,
      status: 'PENDING',
    });

    // ─── ADIM 2: StoryAgent job kaydı oluştur ───────────────────────────────
    const job = await this.jobRepo.create({
      storyId: story.id,
      agentType: 'STORY',
      status: 'RUNNING',
      startedAt: new Date(),
    });

    // WEBSOCKET: Job başladığında frontend'e bildirim gönder
    this.broadcast?.('job:update', {
      storyId: story.id,
      jobId: job.id,
      agentType: 'STORY',
      status: 'RUNNING',
    });

    try {
      // ─── ADIM 3: StoryAgent'ı çalıştır ─────────────────────────────────
      logger.info('StoryAgent tetikleniyor', { storyId: story.id });
      const output = await this.storyAgent.generate(dto.prompt, language);

      // ─── ADIM 4: Story kaydını güncelle ─────────────────────────────────
      const updatedStory = await this.storyRepo.update(story.id, {
        title: output.title,
        content: output.content,
        summary: output.summary,
        mood: output.mood,
        status: 'COMPLETED',
      });

      // ─── ADIM 5: Job'ı tamamlandı olarak işaretle ───────────────────────
      await this.jobRepo.updateStatus(job.id, 'COMPLETED', {
        result: JSON.stringify({ title: output.title }),
        completedAt: new Date(),
      });

      // WEBSOCKET: Hikaye hazır olduğunda frontend'e bildirim gönder
      this.broadcast?.('story:ready', {
        storyId: story.id,
        title: output.title,
        mood: output.mood,
      });

      logger.info('Hikaye başarıyla oluşturuldu', { storyId: story.id, title: output.title });
      return toStoryResponseDTO(updatedStory);

    } catch (error) {
      // ERROR BOUNDARY: Hata burada yakalanır, kullanıcıya anlamlı mesaj döner
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      logger.error('StoryAgent hatası', { storyId: story.id, error: errorMessage });

      await this.storyRepo.updateStatus(story.id, 'FAILED');
      await this.jobRepo.updateStatus(job.id, 'FAILED', { error: errorMessage, completedAt: new Date() });

      this.broadcast?.('job:update', {
        storyId: story.id,
        jobId: job.id,
        agentType: 'STORY',
        status: 'FAILED',
        error: errorMessage,
      });

      throw new Error(`Masal üretilemedi: ${errorMessage}`);
    }
  }
}
