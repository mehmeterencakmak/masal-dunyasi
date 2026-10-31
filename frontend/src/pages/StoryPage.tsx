// ─── HİKAYE SAYFASI — Üretilen masal + tüm agentlar ──────────────
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { storyApi, agentApi, Story, JobStatus, Comment } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import ColoringCanvas from '../components/story/ColoringCanvas'
import TaleBuddy from '../components/story/TaleBuddy'
import NightCover from '../components/story/NightCover'
import { 
  Volume2, 
  Image as ImageIcon, 
  Music, 
  Video, 
  FileText, 
  ArrowLeft, 
  Check, 
  Loader2, 
  AlertTriangle,
  HelpCircle,
  Calendar,
  Sparkles,
  MessageSquare,
  Trash2,
  Edit3,
  Palette,
  Flag
} from 'lucide-react'

type AgentKey = 'tts' | 'image' | 'music' | 'video' | 'coloring'

const MOOD_LABELS: Record<string, string> = {
  magical: 'Mistik/Büyülü',
  adventure: 'Macera',
  funny: 'Eğlenceli',
  romantic: 'Duygusal',
  educational: 'Eğitici',
}

export default function StoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isLoggedIn, user, openAuthModal } = useAuth()

  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Yorumlar & Üyelik
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  // Agent durumları
  const [agentStatus, setAgentStatus] = useState<Record<AgentKey, JobStatus | null>>({
    tts: null,
    image: null,
    music: null,
    video: null,
    coloring: null,
  })

  // Audio playback rate controls
  const audioRef = useRef<HTMLAudioElement>(null)
  const hasIncrementedView = useRef(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showColoringModal, setShowColoringModal] = useState(false)
  const isStoryOwner = isLoggedIn && story?.userId === user?.id

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  const applyPlaybackRate = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }

  // İlk yüklemede hikayeyi getir, yorumları yükle
  useEffect(() => {
    if (!id) return
    hasIncrementedView.current = false
    loadStory()
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadComments = async () => {
    if (!id) return
    try {
      const list = await storyApi.getComments(id)
      setComments(list)
    } catch (err) {
      console.error("Yorumlar yüklenemedi:", err)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !id) return
    try {
      const newComment = await storyApi.addComment(id, commentText.trim())
      setComments(prev => [...prev, newComment])
      setCommentText('')
      showToast('Yorumun başarıyla eklendi! 💬', 'success')
      
      // Hikaye detayını tekrar yükle
      const updated = await storyApi.getById(id)
      setStory(updated)
    } catch (err) {
      console.error(err)
      showToast('Yorum gönderilirken bir sorun oluştu.', 'error')
    }
  }

  const handleCommentUpdate = async (commentId: string, newContent: string) => {
    if (!id || !newContent.trim()) return
    try {
      const updated = await storyApi.updateComment(id, commentId, newContent.trim())
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: updated.content } : c))
      setEditingCommentId(null)
      setEditingCommentText('')
      showToast('Yorum başarıyla güncellendi. ✨', 'success')
    } catch (err) {
      console.error(err)
      showToast('Yorum güncellenirken bir sorun oluştu.', 'error')
    }
  }

  const handleCommentDelete = async (commentId: string) => {
    if (!id) return
    if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      try {
        await storyApi.deleteComment(id, commentId)
        setComments(prev => prev.filter(c => c.id !== commentId))
        showToast('Yorum başarıyla silindi. 🧹', 'success')
        
        // Hikaye detayını tekrar yükle
        const updated = await storyApi.getById(id)
        setStory(updated)
      } catch (err) {
        console.error(err)
        showToast('Yorum silinirken bir sorun oluştu.', 'error')
      }
    }
  }

  const handleCommentReport = async (commentId: string) => {
    if (!id) return
    if (window.confirm('Bu yorumu bildirmek (şikayet etmek) istediğinize emin misiniz?')) {
      try {
        await storyApi.reportComment(id, commentId)
        showToast('Yorum başarıyla bildirildi. İnceleme için teşekkürler! 🙏', 'success')
        
        // Refresh comments list
        const list = await storyApi.getComments(id)
        setComments(list)
      } catch (err) {
        console.error(err)
        showToast('Yorum bildirilirken bir sorun oluştu.', 'error')
      }
    }
  }

  const handleStoryReport = async () => {
    if (!id) return
    if (window.confirm('Bu masalı bildirmek (şikayet etmek) istediğinize emin misiniz?')) {
      try {
        await storyApi.reportStory(id)
        showToast('Masal başarıyla bildirildi. Katkınız için teşekkürler! 🙏', 'success')
        navigate('/library')
      } catch (err) {
        console.error(err)
        showToast('Masal bildirilirken bir sorun oluştu.', 'error')
      }
    }
  }

  const loadStory = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await storyApi.getById(id)
      setStory(data)
      // Mevcut URL'lere göre durumları "COMPLETED" olarak işaretle
      setAgentStatus({
        tts: data.audioUrl ? 'COMPLETED' : null,
        image: data.imageUrl ? 'COMPLETED' : null,
        music: data.musicUrl ? 'COMPLETED' : null,
        video: data.videoUrl ? 'COMPLETED' : null,
        coloring: data.coloringUrl ? 'COMPLETED' : null,
      })
      // İzlenme sayısını arttır (React Strict Mode çift tetiklemeyi önle)
      if (!hasIncrementedView.current) {
        hasIncrementedView.current = true
        storyApi.incrementViews(id).catch(e => console.error("İzlenme arttırılamadı:", e))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hikaye yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Agent tetikleyici
  const triggerAgent = async (key: AgentKey) => {
    if (!id) return
    if (agentStatus[key] === 'RUNNING') return

    setAgentStatus(prev => ({ ...prev, [key]: 'RUNNING' }))

    try {
      let result
      switch (key) {
        case 'tts':   result = await agentApi.generateTTS(id); break
        case 'image': result = await agentApi.generateImage(id); break
        case 'music': result = await agentApi.generateMusic(id); break
        case 'video': result = await agentApi.generateVideo(id); break
        case 'coloring': result = await agentApi.generateColoring(id); break
      }

      // Hikaye kaydını güncelle
      setStory(prev => prev ? {
        ...prev,
        [key === 'tts' ? 'audioUrl' : key === 'coloring' ? 'coloringUrl' : `${key}Url`]: result.url,
      } : prev)

      setAgentStatus(prev => ({ ...prev, [key]: 'COMPLETED' }))

      const msgMap = {
        tts: 'Sesli okuma hazır! 🔊',
        image: 'Görsel hazır! 🎨',
        music: 'Müzik hazır! 🎵',
        video: 'Video hazır! 🎬',
        coloring: 'Boyama taslağı hazır! 🎨🖌️',
      }
      showToast(msgMap[key], 'success')
    } catch (err) {
      setAgentStatus(prev => ({ ...prev, [key]: 'FAILED' }))
      const msg = err instanceof Error ? err.message : 'Agent hatası'
      showToast(`❌ ${msg}`, 'error')
    }
  }

  const downloadText = () => {
    if (!story) return
    const content = `${story.title}\n\n${story.content}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${story.title || 'masal'}.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Masal bilgisayarına indirildi! 📥', 'success')
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-emoji">🔮</div>
        <div className="loading-text">Sihirli Kitap Açılıyor...</div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔮</div>
        <div className="empty-state-text">{error || 'Hikaye bulunamadı veya kayboldu.'}</div>
        <button className="chip" style={{ margin: '0 auto' }} onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          <span>Ana Sayfaya Dön</span>
        </button>
      </div>
    )
  }

  // Bazı masallarda paragraflar boşluksuz birleşmiş geliyor; okunabilirlik için ayırıyoruz
  const paragraphs = story.content
    .replace(/([.!?…]["”’']?)(?=[A-ZÇĞİÖŞÜ])/g, '$1\n')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
  const moodLabel = story.mood ? MOOD_LABELS[story.mood] || 'Büyülü' : 'Büyülü'

  const renderStatus = (key: AgentKey) => {
    const s = agentStatus[key]
    if (s === 'COMPLETED') {
      return (
        <div className="status-badge status-ready">
          <Check size={12} />
          <span>Hazır</span>
        </div>
      )
    }
    if (s === 'RUNNING') {
      return (
        <div className="status-badge status-loading">
          <Loader2 className="spinner" size={12} />
          <span>Üretiliyor</span>
        </div>
      )
    }
    if (s === 'FAILED') {
      return (
        <div className="status-badge status-error">
          <AlertTriangle size={12} />
          <span>Hata</span>
        </div>
      )
    }
    return (
      <div className="status-badge status-idle">
        <HelpCircle size={12} />
        <span>Yok</span>
      </div>
    )
  }

  return (
    <div className="story-layout">
      <div className="story-main">
        <Link to="/library" className="story-back">
          <ArrowLeft size={18} />
          <span>Kütüphaneye dön</span>
        </Link>
        <div className="story-header">
          <h1 className="story-title">{story.title || 'İsimsiz Masal'}</h1>
          
          <div className="story-meta">
            <div className="status-badge status-ready">
              <span>{moodLabel}</span>
            </div>
            
            <div className="status-badge status-idle">
              <Calendar size={12} />
              <span>{new Date(story.createdAt).toLocaleDateString('tr-TR')}</span>
            </div>

            {isLoggedIn && !isStoryOwner && (
              <button
                onClick={handleStoryReport}
                className="status-badge"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '600',
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  transition: 'background 0.2s'
                }}
                title="Masalı Bildir / Şikayet Et"
              >
                <Flag size={11} style={{ color: 'var(--danger)' }} />
                <span>Masalı Bildir</span>
              </button>
            )}
          </div>
        </div>

        <div className="story-image">
          {story.imageUrl ? (
            <img src={story.imageUrl} alt={story.title} />
          ) : (
            <div className="story-image-placeholder"><NightCover size={160} /></div>
          )}
        </div>

        <div className="story-text-box">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {/* AI Masal Arkadaşı */}
        {isLoggedIn ? (
          <TaleBuddy storyId={story.id} storyTitle={story.title || 'Masal'} />
        ) : (
          <div className="comment-section" style={{ marginTop: '40px', background: 'var(--bg-cosmic)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', justifyContent: 'center' }}>
              <Sparkles size={20} style={{ color: 'var(--secondary)' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>AI Masal Arkadaşı</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Bilge Baykuş 🦉 ve Şirin Ejderha 🐉 seninle masal hakkında konuşmak için sabırsızlanıyor! Onlarla sohbet etmek için lütfen giriş yapın veya misafir girişi yapın.
            </p>
            <button className="nav-btn-login" onClick={openAuthModal} style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Giriş Yap / Üye Ol</span>
            </button>
          </div>
        )}

        {/* Yorumlar Bölümü */}
        <div className="comments-section">
          <div className="comments-header">
            <MessageSquare size={20} style={{ color: 'var(--primary)' }} />
            <span>Yorumlar ({comments.length})</span>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                Henüz hiç yorum yapılmamış. İlk yorumu sen yap!
              </p>
            ) : (
              comments.map((c) => {
                const authorName = c.user?.name || c.user?.email || 'Gizemli Yazar'
                const isCommentOwner = isLoggedIn && c.userId === user?.id
                const isStoryOwner = isLoggedIn && story?.userId === user?.id
                const isAdmin = isLoggedIn && user?.role === 'ADMIN'

                return (
                  <div key={c.id} className="comment-item">
                    <div className="comment-meta">
                      <div className="comment-author-badge">
                        <div className="comment-author-avatar">
                          {authorName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="comment-author-name">{authorName}</span>
                        <span className="comment-date-separator" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>•</span>
                        <span className="comment-date">
                          {new Date(c.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {isLoggedIn && !isCommentOwner && (
                        <button
                          className="comment-report-btn"
                          onClick={() => handleCommentReport(c.id)}
                          title="Yorumu Şikayet Et"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            marginLeft: 'auto',
                            transition: 'color 0.2s'
                          }}
                        >
                          <Flag size={12} />
                          <span>Şikayet Et</span>
                        </button>
                      )}

                      {(isStoryOwner || isAdmin) && (
                        <div style={{ display: 'inline-flex', gap: '8px', marginLeft: isLoggedIn && !isCommentOwner ? '12px' : 'auto' }}>
                          <button
                            className="comment-edit-btn"
                            onClick={() => {
                              setEditingCommentId(c.id)
                              setEditingCommentText(c.content)
                            }}
                            title="Yorumu Düzenle"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s'
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="comment-delete-btn"
                            onClick={() => handleCommentDelete(c.id)}
                            title="Yorumu Sil"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <div className="comment-edit-box" style={{ marginTop: '10px' }}>
                        <textarea
                          className="comment-textarea"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          style={{ minHeight: '60px', width: '100%', padding: '10px', fontSize: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="chip"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingCommentText('')
                            }}
                            style={{ padding: '4px 12px', fontSize: '12px', background: 'var(--bg-cosmic)' }}
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            className="comment-submit-btn"
                            onClick={() => handleCommentUpdate(c.id, editingCommentText)}
                            style={{ padding: '4px 12px', fontSize: '12px', width: 'auto' }}
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="comment-content">{c.content}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {isLoggedIn ? (
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <textarea
                className="comment-textarea"
                placeholder="Bu masal hakkında ne düşünüyorsun? Bir yorum bırak..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
              <button type="submit" className="comment-submit-btn">
                <span>Yorum Gönder</span>
              </button>
            </form>
          ) : (
            <div className="comment-auth-alert">
              <span className="comment-auth-text">
                💬 Yorum yapabilmek için lütfen siteye üye olup giriş yapın.
              </span>
              <button 
                type="button" 
                className="comment-auth-btn"
                onClick={openAuthModal}
              >
                Giriş Yap / Üye Ol
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="tool-panel">
        {/* SES — Herkese Açık */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-card-title">
              <Volume2 size={16} style={{ color: '#f472b6' }} />
              <span>Seslendirme</span>
            </div>
            {renderStatus('tts')}
          </div>
          
          {isLoggedIn ? (
            <>
              {/* Mevcut audio yoksa veya story sahibiyse üret butonu göster */}
              {(!story.audioUrl || isStoryOwner) && (
                <button
                  className="tool-btn tool-btn-audio"
                  onClick={() => triggerAgent('tts')}
                  disabled={agentStatus.tts === 'RUNNING'}
                  style={{ marginBottom: story.audioUrl ? '8px' : '0' }}
                >
                  {agentStatus.tts === 'RUNNING' ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      <span>Ses Üretiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={16} />
                      <span>{story.audioUrl && isStoryOwner ? 'Yeniden Seslendir' : 'Sesli Oku'}</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : !story.audioUrl ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
              Seslendirme için giriş yapın.
              <button onClick={openAuthModal} style={{ display: 'inline-flex', margin: '8px auto 0 auto', fontSize: '12px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }}>Giriş Yap</button>
            </div>
          ) : null}
          
          {story.audioUrl && (
            <div className="audio-player">
              <audio 
                ref={audioRef}
                controls 
                src={story.audioUrl} 
                onPlay={applyPlaybackRate}
                onLoadedMetadata={applyPlaybackRate}
              />
              
              <div className="speed-controls">
                <span className="speed-label">Hız:</span>
                {[1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <button
                    key={rate}
                    className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                    onClick={() => changePlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GÖRSEL */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-card-title">
              <ImageIcon size={16} style={{ color: '#60a5fa' }} />
              <span>Kapak Görseli</span>
            </div>
            {isStoryOwner && renderStatus('image')}
          </div>

          {isStoryOwner ? (
            <button
              className="tool-btn tool-btn-image"
              onClick={() => triggerAgent('image')}
              disabled={agentStatus.image === 'RUNNING'}
            >
              {agentStatus.image === 'RUNNING' ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>DALL-E Çiziyor...</span>
                </>
              ) : (
                <>
                  <ImageIcon size={16} />
                  <span>{story.imageUrl ? 'Yeniden Çiz' : 'Görsel Üret'}</span>
                </>
              )}
            </button>
          ) : !story.imageUrl ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', background: 'rgba(15, 23, 42, 0.03)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', textAlign: 'center', marginTop: '6px' }}>
              🎨 Kapak görseli henüz çizilmemiş.
            </div>
          ) : null}
        </div>

        {/* MÜZİK */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-card-title">
              <Music size={16} style={{ color: 'var(--primary-hover)' }} />
              <span>Fon Müziği</span>
            </div>
            {isStoryOwner && renderStatus('music')}
          </div>

          {isStoryOwner ? (
            <button
              className="tool-btn tool-btn-music"
              onClick={() => triggerAgent('music')}
              disabled={agentStatus.music === 'RUNNING'}
            >
              {agentStatus.music === 'RUNNING' ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Beste Yapılıyor...</span>
                </>
              ) : (
                <>
                  <Music size={16} />
                  <span>{story.musicUrl ? 'Yeniden Üret' : 'Müzik Üret'}</span>
                </>
              )}
            </button>
          ) : !story.musicUrl ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
              Fon müziği henüz eklenmemiş.
            </div>
          ) : null}
          
          {story.musicUrl && (
            <div className="music-player">
              <audio controls src={story.musicUrl} />
            </div>
          )}
        </div>

        {/* VİDEO */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-card-title">
              <Video size={16} style={{ color: '#34d399' }} />
              <span>Animasyon</span>
            </div>
            {isStoryOwner && renderStatus('video')}
          </div>

          {isStoryOwner ? (
            <button
              className="tool-btn tool-btn-video"
              onClick={() => triggerAgent('video')}
              disabled={agentStatus.video === 'RUNNING' || !story.imageUrl}
              title={!story.imageUrl ? 'Önce kapak görseli üretilmelidir' : ''}
            >
              {agentStatus.video === 'RUNNING' ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Animasyon Hazırlanıyor...</span>
                </>
              ) : (
                <>
                  <Video size={16} />
                  <span>{story.videoUrl ? 'Yeniden Üret' : 'Video Üret'}</span>
                </>
              )}
            </button>
          ) : !story.videoUrl ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
              Animasyon henüz hazırlanmamış.
            </div>
          ) : null}
          
          {story.videoUrl && (
            <div className="video-player">
              <video controls src={story.videoUrl} />
            </div>
          )}
        </div>

        {/* BOYAMA SAYFASI — Herkese Açık */}
        <div className="tool-card">
          <div className="tool-card-header">
            <div className="tool-card-title">
              <Palette size={16} style={{ color: '#a855f7' }} />
              <span>Boyama Kitabı</span>
            </div>
            {renderStatus('coloring')}
          </div>

          {isLoggedIn ? (
            <>
              {/* Boyama sayfası yoksa veya story sahibiyse üret butonu göster */}
              {(!story.coloringUrl || isStoryOwner) && (
                <button
                  className="tool-btn"
                  onClick={() => triggerAgent('coloring')}
                  disabled={agentStatus.coloring === 'RUNNING'}
                  style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', color: '#a855f7', marginBottom: story.coloringUrl ? '8px' : '0' }}
                >
                  {agentStatus.coloring === 'RUNNING' ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      <span>Boyama Çiziliyor...</span>
                    </>
                  ) : (
                    <>
                      <Palette size={16} />
                      <span>{story.coloringUrl && isStoryOwner ? 'Yeniden Tasarla' : 'Boyama Sayfası Üret'}</span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : !story.coloringUrl ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
              Boyama için giriş yapın.
              <button onClick={openAuthModal} style={{ display: 'inline-flex', margin: '8px auto 0 auto', fontSize: '12px', background: 'none', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold' }}>Giriş Yap</button>
            </div>
          ) : null}

          {story.coloringUrl && (
            <button
              className="tool-btn"
              onClick={() => {
                if (!isLoggedIn) { openAuthModal(); return; }
                setShowColoringModal(true);
              }}
              style={{ marginTop: story.coloringUrl && isLoggedIn && (!story.coloringUrl || isStoryOwner) ? '8px' : '0', background: 'var(--primary)', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Palette size={14} />
              <span>Resmi Boya 🎨</span>
            </button>
          )}
        </div>

        {/* İNDİR */}
        <div className="tool-card">
          <div className="tool-card-title" style={{ color: 'var(--secondary)', marginBottom: '14px' }}>
            <Sparkles size={16} />
            <span>Paylaş & Sakla</span>
          </div>
          
          <button className="tool-btn tool-btn-download" onClick={downloadText} style={{ marginBottom: '8px' }}>
            <FileText size={16} />
            <span>Hikaye Metnini İndir</span>
          </button>
          
          <button
            className="tool-btn"
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', borderColor: 'var(--border)' }}
          >
            <ArrowLeft size={16} />
            <span>Yeni Bir Masal Yaz</span>
          </button>
        </div>
      </aside>

      {showColoringModal && story.coloringUrl && (
        <ColoringCanvas 
          storyId={story.id}
          outlineUrl={story.coloringUrl} 
          storyTitle={story.title || 'Masal'} 
          onClose={() => setShowColoringModal(false)} 
        />
      )}
    </div>
  )
}
