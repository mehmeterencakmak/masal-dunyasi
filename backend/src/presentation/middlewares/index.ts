// ─── MIDDLEWARE'LER ──────────────────────────────────────────────────────────
// Express middleware katmanı: kimlik doğrulama, hata yönetimi, validasyon

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z, ZodSchema } from 'zod';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/database/prismaClient';

// ─── Auth Middleware ─────────────────────────────────────────────────────────
// JWT token doğrular — opsiyonel kullanımda hata fırlatmaz

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(); // Anonim kullanıma izin ver
    return;
  }

  try {
    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET ?? 'dev_secret';
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
  } catch {
    // Geçersiz token — anonim devam et
  }

  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    if (user.status === 'BLOCKED') {
      res.status(403).json({ error: 'Hesabınız askıya alınmıştır' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Kimlik doğrulama sırasında bir hata oluştu' });
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    if (user.status === 'BLOCKED') {
      res.status(403).json({ error: 'Hesabınız askıya alınmıştır' });
      return;
    }
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Bu işlem için admin yetkisi gereklidir' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Yetki kontrolü sırasında bir hata oluştu' });
  }
}

// ─── Validasyon Middleware Fabrikası ─────────────────────────────────────────
// Zod schema ile istek gövdesini doğrular

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Geçersiz istek',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ─── Hata Middleware ─────────────────────────────────────────────────────────
// ERROR BOUNDARY: Tüm yakalanmamış hatalar buraya düşer

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV === 'development';

  logger.error('İşlenmeyen hata', {
    message: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: isDev ? err.stack : undefined,
  });

  // Kullanıcıya iç hata detayları gösterilmez
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Sunucu hatası oluştu' : err.message,
    code: err.code,
    ...(isDev && { stack: err.stack }),
  });
}

// ─── Zod Validasyon Şemaları ──────────────────────────────────────────────────
export const storyRequestSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Konu en az 10 karakter olmalıdır')
    .max(500, 'Konu en fazla 500 karakter olabilir')
    .trim(),
  language: z.enum(['tr', 'en']).optional().default('tr'),
});

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  name: z.string().min(2).max(50).optional(),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});
