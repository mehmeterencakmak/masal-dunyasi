import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { IUserRepository } from '../../domain/repositories';
import { AuthRequest } from '../middlewares';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/database/prismaClient';

export class AuthController {
  constructor(private userRepo: IUserRepository) {}

  // POST /api/auth/register
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'E-posta ve şifre gereklidir' });
        return;
      }

      const existingUser = await this.userRepo.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await this.userRepo.create({
        email,
        password: hashedPassword,
        name: name || null,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET ?? 'dev_secret',
        { expiresIn: '30d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          status: user.status,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'E-posta ve şifre gereklidir' });
        return;
      }

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026!';
      const adminEmail = `${ADMIN_USERNAME}@admin.local`;

      // Intercept admin login attempts
      if (email === ADMIN_USERNAME || email === adminEmail) {
        if (password === ADMIN_PASSWORD) {
          // Find or create admin user
          let adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
          });

          if (!adminUser) {
            adminUser = await prisma.user.create({
              data: {
                email: adminEmail,
                password: 'ADMIN_ACCOUNT_NO_PASSWORD',
                name: 'Yönetici',
                role: 'ADMIN',
                status: 'ACTIVE',
              },
            });
            logger.info(`Admin hesabı oluşturuldu: ${adminUser.email}`);
          }

          // Generate JWT token for admin
          const token = jwt.sign(
            { userId: adminUser.id },
            process.env.JWT_SECRET ?? 'dev_secret',
            { expiresIn: '8h' }
          );

          logger.info(`Admin girişi yapıldı: ${adminUser.email}`);
          res.json({
            token,
            user: {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name || 'Yönetici',
              role: adminUser.role,
              status: adminUser.status,
            },
          });
          return;
        } else {
          // Incorrect password for admin
          res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
          return;
        }
      }

      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        return;
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET ?? 'dev_secret',
        { expiresIn: '30d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          status: user.status,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/forgot-password
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'E-posta adresi gereklidir' });
        return;
      }

      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        // Güvenlik gereği e-postanın kayıtlı olup olmadığını açıkça belirtmeyebiliriz
        // Ama test kolaylığı açısından hata veya bilgi dönebiliriz.
        res.status(404).json({ error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı' });
        return;
      }

      // 8 karakterli rastgele yeni geçici şifre üret
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let tempPassword = '';
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Yeni şifreyi hashle
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Veritabanını güncelle
      await this.userRepo.update(user.id, { password: hashedPassword });

      // E-posta simülasyonunu günlüğe kaydet
      const emailContent = `
========================================================================
📧 GÖNDERİLEN E-POSTA (ŞİFRE SIFIRLAMA SİMÜLATÖRÜ)
========================================================================
Tarih: ${new Date().toLocaleString('tr-TR')}
Alıcı: ${user.email}
Konu: Masal Diyarı Şifre Sıfırlama Talebi

Sayın ${user.name || 'Kullanıcı'},

Hesabınız için şifre sıfırlama talebinde bulundunuz. 
Sizin için geçici bir şifre oluşturulmuştur. Bu şifreyi kullanarak giriş 
yapabilir ve profilinizden şifrenizi dilediğiniz gibi güncelleyebilirsiniz.

Geçici Şifreniz: ${tempPassword}

Masallarla Dolu Günler Dileriz!
✨ Masal Diyarı Ekibi ✨
========================================================================
`;

      const logPath = path.join(__dirname, '../../../simulated_emails.log');
      fs.appendFileSync(logPath, emailContent, 'utf8');

      // Konsola da yazdır (geliştirici görsün)
      console.log(emailContent);
      logger.info(`Şifre sıfırlama e-postası simüle edildi: ${user.email} -> Geçici Şifre: ${tempPassword}`);

      res.json({ message: 'Yeni şifreniz e-posta adresinize gönderildi! (simulated_emails.log dosyasını kontrol edin)' });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/auth/me
  getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Giriş yapılmamış' });
        return;
      }

      const user = await this.userRepo.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        status: user.status,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/auth/guest
  guestLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const guestId = Math.random().toString(36).substring(2, 10);
      const email = `guest_${guestId}@masaldunyasi.com`;
      const name = `Misafir #${guestId.toUpperCase()}`;
      
      const hashedPassword = await bcrypt.hash(Math.random().toString(), 10);
      
      const user = await this.userRepo.create({
        email,
        password: hashedPassword,
        name,
      });

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET ?? 'dev_secret',
        { expiresIn: '30d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
          status: user.status,
        },
      });
      logger.info(`Yeni misafir girişi yapıldı: ${name} (${user.id})`);
    } catch (err) {
      next(err);
    }
  };
}
