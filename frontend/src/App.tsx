// ─── APP — Uygulama kök bileşeni ve routing ──────────────────────────
import React from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import StoryPage from './pages/StoryPage'
import LibraryPage from './pages/LibraryPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import GalleryPage from './pages/GalleryPage'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthModal from './components/auth/AuthModal'
import { Loader2, Sparkles } from 'lucide-react'

function AppContent() {
  const { loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) {
    return (
      <div className="app-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-cosmic)' }}>
        <Loader2 className="spinner" size={40} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Sihirli Evren Yükleniyor...</span>
      </div>
    )
  }

  const isCreatePage = pathname === '/create';

  return (
    <div className="app">
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/story/:id" element={<StoryPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-paneli" element={<AdminPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal />

      {/* Floating Magic Wand FAB */}
      {!isCreatePage && (
        <Link to="/create" className="magic-fab" title="Masal Yazmaya Başla! 🪄">
          <div className="magic-fab-sparkles">
            <Sparkles size={12} className="magic-fab-sparkle-1" />
            <Sparkles size={10} className="magic-fab-sparkle-2" />
          </div>
          <span className="magic-fab-text">Masal Yaz 🪄</span>
        </Link>
      )}
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
