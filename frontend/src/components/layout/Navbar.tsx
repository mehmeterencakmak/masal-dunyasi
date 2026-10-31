// ─── NAVBAR ───────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Compass, BookOpen, User, LogOut, Menu, X, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { isLoggedIn, user, openAuthModal, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
        <Moon className="logo-icon" size={26} style={{ color: 'var(--primary)' }} />
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
