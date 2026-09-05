// ─── NAVBAR ───────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Compass, BookOpen, User, LogOut, Menu, X, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { isLoggedIn, user, openAuthModal, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('masal-dunyasi:theme') as 'light' | 'dark') || 'light'
  })

  // Theme Sync on load and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('masal-dunyasi:theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Route değiştiğinde mobil menüyü kapat
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo" onClick={() => setIsMobileMenuOpen(false)}>
        <Sparkles className="logo-icon" size={24} style={{ color: 'var(--secondary)' }} />
        <span>Masal Diyarı</span>
      </Link>

      {/* Desktop Links (Hidden on Mobile) */}
      <div className="nav-links desktop-only" style={{ display: 'flex', alignItems: 'center' }}>
        <Link
          to="/"
          className={`nav-link ${pathname === '/' ? 'active' : ''}`}
        >
          <Compass size={16} />
          Ana Sayfa
        </Link>

        <Link
          to="/create"
          className={`nav-link nav-link-cta ${pathname === '/create' ? 'active' : ''}`}
        >
          <Sparkles size={16} className="nav-link-cta-icon" />
          Masal Oluştur
        </Link>

        <Link
          to="/library"
          className={`nav-link ${pathname === '/library' ? 'active' : ''}`}
        >
          <BookOpen size={16} />
          Kütüphane
        </Link>

        <Link
          to="/gallery"
          className={`nav-link ${pathname === '/gallery' ? 'active' : ''}`}
        >
          <Sparkles size={16} />
          Sihirli Galeri
        </Link>
        
        {/* Tema Değiştirme Butonu */}
        <button 
          className="nav-theme-toggle" 
          onClick={toggleTheme} 
          title={theme === 'light' ? 'Gece Modu' : 'Gündüz Modu'}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-main)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            marginLeft: '8px'
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {isLoggedIn ? (
          <div className="nav-user-menu" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin-paneli"
                className={`nav-link ${pathname === '/admin-paneli' ? 'active' : ''}`}
                style={{ color: 'var(--secondary)', fontWeight: 'bold' }}
              >
                🛡️ Admin
              </Link>
            )}
            <Link
              to="/dashboard"
              className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <User size={16} />
              <span>Panelim</span>
            </Link>
            <Link to="/dashboard" className="nav-user-avatar" title={user?.name || user?.email} style={{ textDecoration: 'none' }}>
              {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
            </Link>
            <button className="nav-btn-login logged-in" onClick={handleLogout} title="Çıkış Yap">
              <LogOut size={14} />
              <span>Çıkış Yap</span>
            </button>
          </div>
        ) : (
          <div style={{ marginLeft: '12px' }}>
            <button className="nav-btn-login" onClick={openAuthModal}>
              <User size={14} />
              <span>Giriş Yap / Üye Ol</span>
            </button>
          </div>
        )}
      </div>

      {/* Hamburger Toggle Button (Mobile Only) */}
      <button 
        className="nav-hamburger" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        aria-label="Menüyü Aç/Kapat"
      >
        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Drawer Navigation Overlay */}
      <div className={`nav-mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-mobile-links">
          {/* Mobil Gece/Gündüz Modu Butonu */}
          <button 
            className="nav-mobile-link" 
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', justifyContent: 'flex-start' }}
          >
            {theme === 'light' ? (
              <>
                <Moon size={18} />
                <span>Gece Modu'na Geç</span>
              </>
            ) : (
              <>
                <Sun size={18} />
                <span>Gündüz Modu'na Geç</span>
              </>
            )}
          </button>

          <Link
            to="/"
            className={`nav-mobile-link ${pathname === '/' ? 'active' : ''}`}
          >
            <Compass size={18} />
            Ana Sayfa
          </Link>

          <Link
            to="/create"
            className={`nav-mobile-link nav-mobile-link-cta ${pathname === '/create' ? 'active' : ''}`}
          >
            <Sparkles size={18} className="nav-link-cta-icon" />
            Masal Oluştur
          </Link>

          <Link
            to="/library"
            className={`nav-mobile-link ${pathname === '/library' ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            Kütüphane
          </Link>

          <Link
            to="/gallery"
            className={`nav-mobile-link ${pathname === '/gallery' ? 'active' : ''}`}
          >
            <Sparkles size={18} />
            Sihirli Galeri
          </Link>

          {isLoggedIn ? (
            <>
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin-paneli"
                  className={`nav-mobile-link ${pathname === '/admin-paneli' ? 'active' : ''}`}
                  style={{ color: 'var(--secondary)' }}
                >
                  🛡️ Admin Paneli
                </Link>
              )}
              <Link
                to="/dashboard"
                className={`nav-mobile-link ${pathname === '/dashboard' ? 'active' : ''}`}
              >
                <User size={18} />
                Panelim ({user?.name || user?.email})
              </Link>
              <button className="nav-mobile-btn-logout" onClick={handleLogout}>
                <LogOut size={16} />
                Çıkış Yap
              </button>
            </>
          ) : (
            <button 
              className="nav-mobile-btn-login" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAuthModal();
              }}
            >
              <User size={16} />
              Giriş Yap / Üye Ol
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
