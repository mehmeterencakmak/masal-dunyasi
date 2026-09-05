// ─── UYGULAMA GİRİŞ NOKTASI ─────────────────────────────────────────────────
// Dependency Injection, Express server bootstrap ve WebSocket kurulumu.
// Tüm bağımlılıklar burada birleştirilir — "Composition Root" pattern.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

import { logger } from './infrastructure/logger';
import { prisma } from './infrastructure/database/prismaClient';
import { errorMiddleware } from './presentation/middlewares';

// ─── Repository'ler ──────────────────────────────────────────────────────────
import {
  PrismaStoryRepository,
  PrismaUserRepository,
  PrismaJobRepository,
  PrismaLikeRepository,
  PrismaCommentRepository,
  PrismaFeedbackRepository,
  PrismaArtworkRepository,
} from './infrastructure/database/repositories';

// ─── Agent'lar ───────────────────────────────────────────────────────────────
import {
  StoryAgent,
  TTSAgent,
  ImageAgent,
  MusicAgent,
  VideoAgent,
  ColoringAgent,
} from './infrastructure/agents';

// ─── Use Case'ler ─────────────────────────────────────────────────────────────
import { GenerateStoryUseCase } from './application/use-cases/GenerateStoryUseCase';
import {
  GenerateTTSUseCase,
  GenerateImageUseCase,
  GenerateMusicUseCase,
  GenerateVideoUseCase,
  GenerateColoringUseCase,
} from './application/use-cases/AgentUseCases';

// ─── Controller'lar ve Router'lar ────────────────────────────────────────────
import { StoryController, AgentController, AuthController, UserController, CommentController, FeedbackController, AdminController, ArtworkController } from './presentation/controllers';
import { ChatController } from './presentation/controllers/chatController';
import { createStoryRouter, createAgentRouter, createAuthRouter, createUserRouter, createChatRouter, createFeedbackRouter, createAdminRouter, createArtworkRouter } from './presentation/routes';

// ────────────────────────────────────────────────────────────────────────────
async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = parseInt(process.env.PORT ?? '3001', 10);
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

  // ─── WEBSOCKET KURULUMU ────────────────────────────────────────────────────
  // WEBSOCKET: Job durumu değişince ilgili client'lara broadcast yapılır.
  // Her client bağlandığında storyId ile bir odaya katılır.
  const io = new SocketIOServer(httpServer, {
    cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
  });

  // WebSocket broadcast fonksiyonu — use case'lere enjekte edilir
  const broadcast = (event: string, data: unknown) => {
    const payload = data as { storyId?: string };
    if (payload?.storyId) {
      // Sadece ilgili hikayeyi dinleyen client'lara gönder
      io.to(`story:${payload.storyId}`).emit(event, data);
    }
    // Global dinleyicilere de yayınla
    io.emit(event, data);
  };

  io.on('connection', (socket) => {
    logger.info('WebSocket bağlantısı kuruldu', { socketId: socket.id });

    // Client belirli bir hikayeyi takip etmek istiyorsa odaya katılır
    socket.on('subscribe:story', (storyId: string) => {
      socket.join(`story:${storyId}`);
      logger.debug('Client hikayeye abone oldu', { socketId: socket.id, storyId });
    });

    socket.on('disconnect', () => {
      logger.debug('WebSocket bağlantısı kesildi', { socketId: socket.id });
    });
  });

  // ─── EXPRESS AYARLARI ─────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Uploads için gerekli
  }));

  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Statik dosya sunumu — üretilen medya dosyaları için
  const uploadPath = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './uploads');
  app.use('/uploads', express.static(uploadPath));

  // ─── RATE LIMITING ────────────────────────────────────────────────────────
  // Hikaye üretme endpoint'i için dakikada 5 istek limiti
  const generateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Çok fazla istek gönderdiniz. Lütfen 1 dakika bekleyin.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Agent endpoint'leri için dakikada 10 istek limiti
  const agentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Çok fazla agent isteği. Lütfen bekleyin.' },
  });

  // ─── DEPENDENCY INJECTION (Composition Root) ──────────────────────────────
  // AGENT BAŞLATMA: Her agent instance'ı burada oluşturulur ve enjekte edilir.

  // Repository'ler
  const storyRepo = new PrismaStoryRepository();
  const userRepo = new PrismaUserRepository();
  const jobRepo = new PrismaJobRepository();
  const likeRepo = new PrismaLikeRepository();
  const commentRepo = new PrismaCommentRepository();
  const feedbackRepo = new PrismaFeedbackRepository();
  const artworkRepo = new PrismaArtworkRepository();

  // Agent'lar
  const storyAgent = new StoryAgent();
  const ttsAgent = new TTSAgent();
  const imageAgent = new ImageAgent();
  const musicAgent = new MusicAgent();
  const videoAgent = new VideoAgent();
  const coloringAgent = new ColoringAgent();

  // Use Case'ler
  const generateStoryUC = new GenerateStoryUseCase(storyRepo, jobRepo, storyAgent, broadcast);
  const generateTTSUC = new GenerateTTSUseCase(storyRepo, jobRepo, ttsAgent, broadcast);
  const generateImageUC = new GenerateImageUseCase(storyRepo, jobRepo, imageAgent, broadcast);
  const generateMusicUC = new GenerateMusicUseCase(storyRepo, jobRepo, musicAgent, broadcast);
  const generateVideoUC = new GenerateVideoUseCase(storyRepo, jobRepo, videoAgent, broadcast);
  const generateColoringUC = new GenerateColoringUseCase(storyRepo, jobRepo, coloringAgent, broadcast);

  // Controller'lar
  const storyController = new StoryController(generateStoryUC, storyRepo, jobRepo, likeRepo);
  const agentController = new AgentController(
    generateTTSUC, generateImageUC, generateMusicUC, generateVideoUC, generateColoringUC, jobRepo
  );
  const authController = new AuthController(userRepo);
  const userController = new UserController(userRepo, storyRepo, commentRepo, likeRepo);
  const commentController = new CommentController(commentRepo, storyRepo);
  const feedbackController = new FeedbackController(feedbackRepo);
  const chatController = new ChatController(storyRepo);
  const adminController = new AdminController();
  const artworkController = new ArtworkController(artworkRepo);

  // ─── ROUTER'LAR ───────────────────────────────────────────────────────────
  app.use('/api/auth', createAuthRouter(authController));
  app.use('/api/users', createUserRouter(userController));
  app.use('/api/stories', createStoryRouter(storyController, commentController, userController, generateLimiter));
  app.use('/api/stories', createChatRouter(chatController));
  app.use('/api/feedbacks', createFeedbackRouter(feedbackController));
  app.use('/api/admin', createAdminRouter(adminController));
  app.use('/api/agents', agentLimiter, createAgentRouter(agentController));
  app.use('/api/artworks', createArtworkRouter(artworkController));

  // Sağlık kontrolü
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      agents: {
        story: !!process.env.GEMINI_API_KEY,
        tts: !!process.env.ELEVENLABS_API_KEY,
        image: true,
        music: !!process.env.REPLICATE_API_TOKEN,
        video: !!process.env.REPLICATE_API_TOKEN,
        coloring: true,
      },
    });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı' });
  });

  // ERROR BOUNDARY: Global hata middleware'i en sona eklenir
  app.use(errorMiddleware);

  // ─── VERİTABANI BAĞLANTISI ────────────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('PostgreSQL bağlantısı kuruldu');

    // commentsCount değerlerini veritabanı ile senkronize et
    const dbStories = await prisma.story.findMany({ select: { id: true, commentsCount: true } });
    for (const story of dbStories) {
      const actualCount = await prisma.comment.count({ where: { storyId: story.id } });
      if (story.commentsCount !== actualCount) {
        await prisma.story.update({
          where: { id: story.id },
          data: { commentsCount: actualCount }
        });
        logger.info(`Masal yorum sayısı senkronize edildi (${story.id}): ${story.commentsCount} -> ${actualCount}`);
      }
    }

    // Geri bildirim (Feedback) tablosunu varsayılan yorumlarla tohumla (seed)
    const feedbackCount = await prisma.feedback.count();
    if (feedbackCount === 0) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        await prisma.feedback.createMany({
          data: [
            {
              userId: defaultUser.id,
              content: "Masal Diyarı sayesinde kızım Elif artık uyku saatlerini sabırsızlıkla bekliyor. Kendi seçtiği karakterlerin masallarını dinlemek ona özgüven aşıladı!",
              rating: 5,
              role: "Ebeveyn"
            },
            {
              userId: defaultUser.id,
              content: "Yaratıcı bir çocuk gelişim aracı. Hem Türkçe hem İngilizce seçeneğiyle oğlumun dil becerileri eğlenceli bir şekilde gelişiyor. Emeği geçenlere teşekkürler.",
              rating: 5,
              role: "Baba"
            },
            {
              userId: defaultUser.id,
              content: "Pedagojik açıdan temiz masallar üretmesi en çok içimi rahatlatan kısım oldu. Şiddet ve kötü örnek oluşturacak hiçbir şeye rastlamadık. Harika!",
              rating: 5,
              role: "Pedagog & Anne"
            }
          ]
        });
        logger.info('Varsayılan ebeveyn geri bildirimleri (Feedback) veritabanına tohumlandı.');
      }
    }
  } catch (err) {
    logger.error('Veritabanı bağlantısı başarısız', { err });
    process.exit(1);
  }

  // ─── SUNUCU BAŞLATMA ──────────────────────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info(`🧙 Masal Diyarı backend başlatıldı`, {
      port: PORT,
      env: process.env.NODE_ENV,
      frontend: FRONTEND_URL,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} alındı — sunucu kapatılıyor`);
    await prisma.$disconnect();
    httpServer.close(() => {
      logger.info('Sunucu kapatıldı');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // userRepo kullanılmıyor ama DI container'da hazır
  void userRepo;
}

bootstrap().catch((err) => {
  console.error('Bootstrap hatası:', err);
  process.exit(1);
});
