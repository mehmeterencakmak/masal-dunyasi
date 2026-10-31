import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User as UserIcon, HelpCircle, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MagicParticles from '../ui/MagicParticles';

type ActiveTab = 'login' | 'register' | 'forgot';

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, login, register, forgotPassword, guestLogin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const navigate = useNavigate();

  if (!showAuthModal) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleClose = () => {
    resetForm();
    setActiveTab('login');
    closeAuthModal();
  };

  const triggerSuccessSequence = (loggedInUser?: any) => {
    setIsSuccess(true);
    setShowParticles(true);
    setTimeout(() => {
      handleClose();
      setIsSuccess(false);
      setShowParticles(false);
      if (loggedInUser?.role === 'ADMIN') {
        navigate('/admin-paneli');
      }
    }, 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const loggedInUser = await login(email, password);
        triggerSuccessSequence(loggedInUser);
      } else if (activeTab === 'register') {
        await register(email, password, name);
        triggerSuccessSequence();
      } else if (activeTab === 'forgot') {
        await forgotPassword(email);
        setActiveTab('login');
        resetForm();
      }
    } catch (err) {
      // Errors are toasted inside context
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MagicParticles active={showParticles} />
      
      <div className="auth-modal-backdrop" onClick={handleClose}>
        <div className={`auth-modal-card ${isSuccess ? 'success-active' : ''}`} onClick={(e) => e.stopPropagation()}>
          {/* Close Button - hidden during success animation */}
          {!isSuccess && (
            <button className="auth-modal-close" onClick={handleClose} aria-label="Kapat">
              <X size={20} />
            </button>
          )}

          {isSuccess ? (
            /* Success Greeting Screen */
            <div className="auth-success-container">
              <div className="auth-success-portal">
                <div className="auth-success-icon-wrapper">
                  <KeyRound size={32} />
                </div>
                <div className="auth-success-sparkles">
                  <Sparkles size={20} style={{ position: 'absolute', top: '10px', left: '10px', color: 'hsl(45, 100%, 60%)' }} />
                  <Sparkles size={14} style={{ position: 'absolute', bottom: '15px', right: '10px', color: 'hsl(330, 100%, 70%)' }} />
                </div>
              </div>
              <h2 className="auth-success-title">Sihirli Kapı Açıldı! 🔑✨</h2>
              <p className="auth-success-message">
                Masal Diyarına hoş geldin, <strong style={{ color: 'var(--primary-hover)' }}>{user?.name || name || 'Masal Gezgini'}</strong>!<br />
                Hayallerini masallara dönüştürmeye hazır mısın?
              </p>
            </div>
          ) : (
            /* Regular Form Screen */
            <>
              {/* Modal Header */}
              <div className="auth-modal-header">
                <div className="auth-modal-logo">
                  <KeyRound size={28} style={{ color: 'var(--secondary)' }} />
                </div>
                <h2 className="auth-modal-title">
                  {activeTab === 'login' && 'Tekrar Hoş Geldin!'}
                  {activeTab === 'register' && 'Masal Diyarına Katıl'}
                  {activeTab === 'forgot' && 'Şifremi Unuttum'}
                </h2>
                <p className="auth-modal-subtitle">
                  {activeTab === 'login' && 'Giriş yaparak hayallerindeki masalları okumaya devam et.'}
                  {activeTab === 'register' && 'Hemen üye ol, sınırsız masal diyarının kapılarını arala!'}
                  {activeTab === 'forgot' && 'E-posta adresini yaz, sana geçici bir giriş şifresi gönderelim.'}
                </p>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="auth-modal-form">
                {activeTab === 'register' && (
                  <div className="auth-input-group">
                    <label className="auth-label">Adınız Soyadınız</label>
                    <div className="auth-input-wrapper">
                      <UserIcon className="auth-input-icon" size={16} />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Kürşat A."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="auth-input-group">
                  <label className="auth-label">E-posta Adresi veya Kullanıcı Adı</label>
                  <div className="auth-input-wrapper">
                    <Mail className="auth-input-icon" size={16} />
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="ornek@domain.com veya admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {activeTab !== 'forgot' && (
                  <div className="auth-input-group">
                    <label className="auth-label">Şifre</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={16} />
                      <input
                        type="password"
                        className="auth-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'login' && (
                  <div className="auth-forgot-link-box">
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => {
                        setActiveTab('forgot');
                        resetForm();
                      }}
                      disabled={loading}
                    >
                      Şifremi Unuttum
                    </button>
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'İşleniyor...' : (
                    <>
                      {activeTab === 'login' && 'Giriş Yap'}
                      {activeTab === 'register' && 'Üye Ol'}
                      {activeTab === 'forgot' && 'Yeni Şifre Gönder'}
                    </>
                  )}
                </button>
              </form>

              {activeTab !== 'forgot' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>veya üye olmadan devam et</span>
                  <button 
                    type="button" 
                    className="magic-random-btn" 
                    onClick={async () => {
                      if (loading) return;
                      setLoading(true);
                      try {
                        await guestLogin();
                        triggerSuccessSequence();
                      } catch (err) {
                        // handled
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(242, 193, 78, 0.25)', background: 'rgba(242, 193, 78, 0.05)', color: 'var(--secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                  >
                    <Sparkles size={14} />
                    <span>Sihirli Dünyaya Misafir Olarak Gir</span>
                  </button>
                </div>
              )}

              {/* Modal Footer Tab Toggles */}
              <div className="auth-modal-footer">
                {activeTab === 'login' && (
                  <p>
                    Hesabın yok mu?{' '}
                    <button
                      type="button"
                      className="auth-toggle-tab-btn"
                      onClick={() => {
                        setActiveTab('register');
                        resetForm();
                      }}
                      disabled={loading}
                    >
                      Üye Ol
                    </button>
                  </p>
                )}

                {activeTab === 'register' && (
                  <p>
                    Zaten üye misin?{' '}
                    <button
                      type="button"
                      className="auth-toggle-tab-btn"
                      onClick={() => {
                        setActiveTab('login');
                        resetForm();
                      }}
                      disabled={loading}
                    >
                      Giriş Yap
                    </button>
                  </p>
                )}

                {activeTab === 'forgot' && (
                  <button
                    type="button"
                    className="auth-back-to-login"
                    onClick={() => {
                      setActiveTab('login');
                      resetForm();
                    }}
                    disabled={loading}
                  >
                    <ArrowLeft size={14} />
                    <span>Giriş Ekranına Dön</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
