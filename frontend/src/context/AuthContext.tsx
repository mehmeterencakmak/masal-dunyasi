import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, UserInfo } from '../services/api';
import { useToast } from '../components/ui/Toast';

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<UserInfo>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: UserInfo) => void;
  guestLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Check initial local session
    const storedToken = localStorage.getItem('masal-dunyasi:token');
    const storedUser = localStorage.getItem('masal-dunyasi:user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);

      // Verify token with backend
      authApi.me()
        .then((profile) => {
          if (profile.status === 'BLOCKED') {
            localStorage.removeItem('masal-dunyasi:token');
            localStorage.removeItem('masal-dunyasi:user');
            localStorage.removeItem('masal-dunyasi:isLoggedIn');
            setToken(null);
            setUser(null);
            setIsLoggedIn(false);
            window.dispatchEvent(new Event('auth-change'));
            showToast('Hesabınız yönetici tarafından askıya alınmıştır! 🚫', 'error');
            return;
          }
          setUser(profile);
          localStorage.setItem('masal-dunyasi:user', JSON.stringify(profile));
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('masal-dunyasi:token');
          localStorage.removeItem('masal-dunyasi:user');
          localStorage.removeItem('masal-dunyasi:isLoggedIn');
          setToken(null);
          setUser(null);
          setIsLoggedIn(false);
          window.dispatchEvent(new Event('auth-change'));
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Keep state in sync with external storage triggers (e.g. login/logout events)
    const handleAuthEvent = () => {
      const nextToken = localStorage.getItem('masal-dunyasi:token');
      const nextUser = localStorage.getItem('masal-dunyasi:user');
      if (nextToken && nextUser) {
        setToken(nextToken);
        setUser(JSON.parse(nextUser));
        setIsLoggedIn(true);
      } else {
        setToken(null);
        setUser(null);
        setIsLoggedIn(false);
      }
    };

    window.addEventListener('auth-change', handleAuthEvent);
    return () => {
      window.removeEventListener('auth-change', handleAuthEvent);
    };
  }, []);

  const openAuthModal = () => {
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('masal-dunyasi:token', data.token);
      localStorage.setItem('masal-dunyasi:user', JSON.stringify(data.user));
      localStorage.setItem('masal-dunyasi:isLoggedIn', 'true');

      setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      closeAuthModal();

      // Dispatch global event for navbar/storage synchronization
      window.dispatchEvent(new Event('auth-change'));
      showToast('Başarıyla giriş yaptın! Hoş geldin. ✨', 'success');
      return data.user;
    } catch (err: any) {
      showToast(err.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.', 'error');
      throw err;
    }
  };

  const handleRegister = async (email: string, password: string, name?: string) => {
    try {
      const data = await authApi.register(email, password, name);
      localStorage.setItem('masal-dunyasi:token', data.token);
      localStorage.setItem('masal-dunyasi:user', JSON.stringify(data.user));
      localStorage.setItem('masal-dunyasi:isLoggedIn', 'true');

      setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      closeAuthModal();

      window.dispatchEvent(new Event('auth-change'));
      showToast('Üyeliğin başarıyla oluşturuldu! Hoş geldin. 🎉', 'success');
    } catch (err: any) {
      showToast(err.message || 'Üyelik oluşturulamadı. Lütfen bilgilerinizi kontrol edin.', 'error');
      throw err;
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      const data = await authApi.forgotPassword(email);
      showToast(data.message || 'Yeni şifreniz e-posta adresinize gönderildi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Şifre sıfırlama işlemi başarısız.', 'error');
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('masal-dunyasi:token');
    localStorage.removeItem('masal-dunyasi:user');
    localStorage.removeItem('masal-dunyasi:isLoggedIn');

    setToken(null);
    setUser(null);
    setIsLoggedIn(false);

    window.dispatchEvent(new Event('auth-change'));
    showToast('Çıkış yapıldı. Tekrar görüşmek üzere! 👋', 'success');
  };

  const handleUpdateUser = (updatedUser: UserInfo) => {
    setUser(updatedUser);
    setIsLoggedIn(true);
    localStorage.setItem('masal-dunyasi:user', JSON.stringify(updatedUser));
    localStorage.setItem('masal-dunyasi:isLoggedIn', 'true');
  };

  const handleGuestLogin = async () => {
    try {
      const data = await authApi.guestLogin();
      localStorage.setItem('masal-dunyasi:token', data.token);
      localStorage.setItem('masal-dunyasi:user', JSON.stringify(data.user));
      localStorage.setItem('masal-dunyasi:isLoggedIn', 'true');

      setToken(data.token);
      setUser(data.user);
      setIsLoggedIn(true);
      closeAuthModal();

      window.dispatchEvent(new Event('auth-change'));
      showToast('Sihirli Dünyaya Misafir Olarak Giriş Yapıldı! ✨🧙', 'success');
    } catch (err: any) {
      showToast(err.message || 'Misafir girişi yapılamadı.', 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        loading,
        showAuthModal,
        openAuthModal,
        closeAuthModal,
        login: handleLogin,
        register: handleRegister,
        forgotPassword: handleForgotPassword,
        logout: handleLogout,
        updateUser: handleUpdateUser,
        guestLogin: handleGuestLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
