import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware, validate, registerSchema, loginSchema } from '../middlewares';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  // Kayıt Ol
  router.post('/register', validate(registerSchema), controller.register);
  // Giriş Yap
  router.post('/login', validate(loginSchema), controller.login);

  // Misafir Girişi
  router.post('/guest', controller.guestLogin);
  // Şifremi Unuttum (Yeni şifre sıfırlama talebi)
  router.post('/forgot-password', controller.forgotPassword);

  // Kullanıcı Profil Bilgilerini Al (JWT ile)
  router.get('/me', authMiddleware, controller.getMe);

  return router;
}
