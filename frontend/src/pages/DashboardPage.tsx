import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { 
  storyApi, 
  userApi, 
  Story, 
  Comment 
} from '../services/api'
import { 
  User, 
  Key, 
  BookOpen, 
  Heart, 
  MessageSquare, 
  Trash2, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ImageOff, 
  Plus,
  Loader2,
  Lock,
  Eye
} from 'lucide-react'

export default function DashboardPage() {
  const { isLoggedIn, user, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'stories' | 'likes' | 'comments' | 'profile'>('stories')
  
  // Data lists
  const [myStories, setMyStories] = useState<Story[]>([])
  const [myLikes, setMyLikes] = useState<Story[]>([])
  const [myComments, setMyComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  // Profile forms
  const [profileName, setProfileName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Story comments moderation state
  const [selectedStoryIdForComments, setSelectedStoryIdForComments] = useState<string | null>(null)
  const [storyComments, setStoryComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/')
      showToast('Lütfen önce giriş yapın! 🔑', 'error')
    } else {
      setProfileName(user?.name || '')
      loadTabContent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, activeTab])

  const loadTabContent = async () => {
    setLoading(true)
    try {
      if (activeTab === 'stories') {
        const stories = await userApi.getMyStories()
        setMyStories(stories)
      } else if (activeTab === 'likes') {
        const likes = await userApi.getMyLikes()
        setMyLikes(likes)
      } else if (activeTab === 'comments') {
        const comments = await userApi.getMyComments()
        setMyComments(comments)
      }
    } catch (err) {
      console.error(err)
      showToast('Bilgiler yüklenirken bir hata oluştu.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update name handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileName.trim()) return
    setProfileLoading(true)
    try {
      const res = await userApi.updateProfile(profileName)
      updateUser({ id: res.id, email: res.email, name: res.name })
      showToast('Profil isminiz güncellendi! ✨', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Profil güncellenemedi', 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    if (newPassword !== confirmPassword) {
      showToast('Şifreler uyuşmuyor!', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      await userApi.changePassword(currentPassword, newPassword)
      showToast('Şifreniz başarıyla değiştirildi! 🔐', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Şifre değiştirilemedi', 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Delete cover image handler
  const handleRemoveImage = async (storyId: string) => {
    if (window.confirm('Bu masalın kapağını silmek istediğinize emin misiniz?')) {
      try {
        await storyApi.removeImage(storyId)
        setMyStories(prev => prev.map(s => s.id === storyId ? { ...s, imageUrl: undefined } : s))
        showToast('Kapak görseli başarıyla silindi. 🖼️', 'success')
      } catch (err) {
        showToast('Görsel silinirken bir sorun oluştu.', 'error')
      }
    }
  }

  // Delete story handler
  const handleDeleteStory = async (storyId: string) => {
    if (window.confirm('Bu masalı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
      try {
        await storyApi.delete(storyId)
        setMyStories(prev => prev.filter(s => s.id !== storyId))
        showToast('Masal kütüphanenizden tamamen silindi. 🧹', 'success')
      } catch (err) {
        showToast('Masal silinirken bir sorun oluştu.', 'error')
      }
    }
  }

  // Unlike handler
  const handleUnlikeStory = async (storyId: string) => {
    try {
      await storyApi.unlike(storyId)
      setMyLikes(prev => prev.filter(s => s.id !== storyId))
      showToast('Masalı beğenmekten vazgeçtiniz. 💔', 'success')
    } catch (err) {
      showToast('İşlem sırasında hata oluştu.', 'error')
    }
  }

  // Delete own comment handler
  const handleDeleteMyComment = async (storyId: string, commentId: string) => {
    if (window.confirm('Yorumunuzu silmek istediğinize emin misiniz?')) {
      try {
        await storyApi.deleteComment(storyId, commentId)
        setMyComments(prev => prev.filter(c => c.id !== commentId))
        showToast('Yorumunuz silindi. 🗑️', 'success')
      } catch (err) {
        showToast('Yorum silinirken hata oluştu.', 'error')
      }
    }
  }

  // Moderate comments on owned story
  const handleToggleStoryComments = async (storyId: string) => {
    if (selectedStoryIdForComments === storyId) {
      setSelectedStoryIdForComments(null)
      setStoryComments([])
      return
    }

    setSelectedStoryIdForComments(storyId)
    setCommentsLoading(true)
    try {
      const list = await storyApi.getComments(storyId)
      setStoryComments(list)
    } catch (err) {
      showToast('Yorumlar yüklenemedi.', 'error')
    } finally {
      setCommentsLoading(false)
    }
  }

  // Moderate comment delete (delete someone else's comment on user's story)
  const handleDeleteStoryComment = async (storyId: string, commentId: string) => {
    if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      try {
        await storyApi.deleteComment(storyId, commentId)
        setStoryComments(prev => prev.filter(c => c.id !== commentId))
        setMyStories(prev => prev.map(s => s.id === storyId ? { ...s, commentsCount: Math.max(0, (s.commentsCount || 1) - 1) } : s))
        showToast('Yorum başarıyla silindi. 🧹', 'success')
      } catch (err) {
        showToast('Yorum silinirken hata oluştu.', 'error')
      }
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ marginBottom: '40px' }}>
        <h1 className="section-label">🧙 Sihirli Üye Paneli</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hoş geldin, <strong style={{ color: 'var(--primary-hover)' }}>{user?.name || user?.email}</strong>! Buradan masallarını ve profilini yönetebilirsin.
        </p>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar Nav */}
        <aside className="dashboard-nav">
          <button 
            className={`db-nav-item ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            <BookOpen size={18} />
            <span>Masallarım</span>
          </button>
          <button 
            className={`db-nav-item ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            <Heart size={18} />
            <span>Beğendiklerim</span>
          </button>
          <button 
            className={`db-nav-item ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            <MessageSquare size={18} />
            <span>Yorumlarım</span>
          </button>
          <button 
            className={`db-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profil & Şifre</span>
          </button>

          <Link to="/create" className="cta-btn" style={{ marginTop: '20px', textDecoration: 'none', padding: '14px' }}>
            <Plus size={16} />
            <span>Yeni Masal Yaz</span>
          </Link>
        </aside>

        {/* Tab Content Box */}
        <main className="dashboard-content">
          {loading && activeTab !== 'profile' ? (
            <div className="db-loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
              <Loader2 className="spinner" size={32} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
              <span style={{ color: 'var(--text-muted)' }}>Sihirli bilgiler yükleniyor...</span>
            </div>
          ) : (
            <>
              {/* MASALLAR TAB */}
              {activeTab === 'stories' && (
                <div className="db-tab-pane">
                  <h3 className="db-pane-title">📚 Yazdığım Masallar ({myStories.length})</h3>
                  
                  {myStories.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <div className="empty-state-icon">📖</div>
                      <div className="empty-state-text">Henüz hiç masal yazmamışsın. Haydi sihirli kelimeleri dök!</div>
                      <Link to="/create" className="chip" style={{ margin: '0 auto' }}>
                        <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
                        <span>Hemen Masal Yaz</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="db-stories-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {myStories.map(story => (
                        <div key={story.id} className="db-story-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <div className="db-story-cover" style={{ width: '120px', height: '80px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                              {story.imageUrl ? (
                                <img src={story.imageUrl} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '24px' }}>✨</span>
                              )}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>{story.title || 'Başlıksız Masal'}</h4>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>📅 {new Date(story.createdAt).toLocaleDateString('tr-TR')}</span>
                                <span>👁️ {story.views} izlenme</span>
                                <span>❤️ {story.likes} beğeni</span>
                                <span>💬 {story.commentsCount} yorum</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions Bar */}
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <Link to={`/story/${story.id}`} className="chip" style={{ textDecoration: 'none' }}>
                              <Eye size={14} />
                              <span>Görüntüle</span>
                            </Link>

                            {story.imageUrl && (
                              <button className="chip" onClick={() => handleRemoveImage(story.id)} style={{ color: 'var(--secondary-hover)' }}>
                                <ImageOff size={14} />
                                <span>Kapağı Sil</span>
                              </button>
                            )}

                            <button className="chip" onClick={() => handleToggleStoryComments(story.id)} style={{ color: 'var(--primary)' }}>
                              <MessageSquare size={14} />
                              <span>Yorumları Yönet ({story.commentsCount})</span>
                            </button>

                            <button className="chip" onClick={() => handleDeleteStory(story.id)} style={{ color: 'var(--danger)', marginLeft: 'auto' }}>
                              <Trash2 size={14} />
                              <span>Sil</span>
                            </button>
                          </div>

                          {/* Story Comments Moderation Drawer */}
                          {selectedStoryIdForComments === story.id && (
                            <div className="comments-moderation-box" style={{ background: 'var(--bg-cosmic)', borderRadius: 'var(--radius-sm)', padding: '16px', marginTop: '10px', border: '1px solid var(--border)' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-muted)' }}>💬 Masala Gelen Yorumlar</h5>
                              
                              {commentsLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                                  <Loader2 className="spinner" size={14} />
                                  <span style={{ fontSize: '13px' }}>Yorumlar yükleniyor...</span>
                                </div>
                              ) : storyComments.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Bu masala henüz hiç yorum gelmemiş.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {storyComments.map(c => {
                                    const cAuthor = c.user?.name || c.user?.email || 'Gizemli Yazar'
                                    return (
                                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-card-solid)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        <div>
                                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                                            <strong style={{ fontSize: '13px' }}>{cAuthor}</strong>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                          <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{c.content}</p>
                                        </div>
                                        <button 
                                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                          onClick={() => handleDeleteStoryComment(story.id, c.id)}
                                          title="Yorumu Moderatör Olarak Sil"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BEĞENDİKLERİM TAB */}
              {activeTab === 'likes' && (
                <div className="db-tab-pane">
                  <h3 className="db-pane-title">❤️ Beğendiğim Masallar ({myLikes.length})</h3>

                  {myLikes.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <div className="empty-state-icon">💖</div>
                      <div className="empty-state-text">Henüz hiçbir masalı beğenmemişsin. Kitaplığı gezip beğeni atabilirsin!</div>
                      <Link to="/library" className="chip" style={{ margin: '0 auto' }}>
                        <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                        <span>Kütüphaneyi Gez</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="library-grid">
                      {myLikes.map(story => (
                        <div key={story.id} className="lib-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                          <Link to={`/story/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="lib-card-cover" style={{ background: '#1E2858' }}>
                              {story.imageUrl ? (
                                <img src={story.imageUrl} alt={story.title} />
                              ) : (
                                <span>✨</span>
                              )}
                            </div>
                            <div className="lib-card-body" style={{ padding: '20px' }}>
                              <h4 className="lib-card-title">{story.title || 'Başlıksız Masal'}</h4>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {new Date(story.createdAt).toLocaleDateString('tr-TR')}</span>
                                <button 
                                  className="reaction-btn liked" 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnlikeStory(story.id); }}
                                  title="Beğeniyi Kaldır"
                                >
                                  <span>❤️</span>
                                  <span>{story.likes}</span>
                                </button>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* YORUMLARIM TAB */}
              {activeTab === 'comments' && (
                <div className="db-tab-pane">
                  <h3 className="db-pane-title">💬 Yazdığım Yorumlar ({myComments.length})</h3>

                  {myComments.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                      <div className="empty-state-icon">💬</div>
                      <div className="empty-state-text">Henüz hiçbir masala yorum yazmamışsın. Masalları okuyup fikirlerini paylaşabilirsin!</div>
                      <Link to="/library" className="chip" style={{ margin: '0 auto' }}>
                        <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                        <span>Kütüphaneyi Gez</span>
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {myComments.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {new Date(c.createdAt).toLocaleDateString('tr-TR')}</span>
                              <span style={{ color: 'var(--border)' }}>|</span>
                              <Link to={`/story/${c.storyId}`} style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-hover)', textDecoration: 'none' }}>
                                📖 {c.story?.title || 'Masala Git'}
                              </Link>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-main)' }}>"{c.content}"</p>
                          </div>
                          
                          <button 
                            className="chip" 
                            style={{ color: 'var(--danger)', border: 'none', background: 'rgba(239, 68, 68, 0.05)' }}
                            onClick={() => handleDeleteMyComment(c.storyId, c.id)}
                            title="Yorumu Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PROFİL & ŞİFRE TAB */}
              {activeTab === 'profile' && (
                <div className="db-tab-pane" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                  {/* Name Form */}
                  <div className="db-form-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <User size={20} style={{ color: 'var(--primary)' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: '800' }}>Profil Bilgilerini Güncelle</h4>
                    </div>
                    <form onSubmit={handleUpdateProfile}>
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>E-posta Adresi (Değiştirilemez)</label>
                        <input 
                          type="email" 
                          value={user?.email || ''} 
                          disabled 
                          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-cosmic)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>Görünen İsim</label>
                        <input 
                          type="text" 
                          value={profileName} 
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Adınızı girin"
                          required
                          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <button type="submit" className="cta-btn" style={{ padding: '12px' }} disabled={profileLoading}>
                        {profileLoading ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
                        <span>Profil Güncelle</span>
                      </button>
                    </form>
                  </div>

                  {/* Password Form */}
                  <div className="db-form-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <Lock size={20} style={{ color: 'var(--secondary)' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: '800' }}>Şifre Değiştir</h4>
                    </div>
                    <form onSubmit={handleChangePassword}>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>Mevcut Şifre</label>
                        <input 
                          type="password" 
                          value={currentPassword} 
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••"
                          required
                          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>Yeni Şifre (En az 6 karakter)</label>
                        <input 
                          type="password" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••"
                          required
                          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>Yeni Şifre Tekrar</label>
                        <input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••"
                          required
                          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <button type="submit" className="cta-btn" style={{ padding: '12px', background: 'var(--primary)' }} disabled={passwordLoading}>
                        {passwordLoading ? <Loader2 className="spinner" size={16} /> : <Key size={16} />}
                        <span>Şifreyi Değiştir</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
