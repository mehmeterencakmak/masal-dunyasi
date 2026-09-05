import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { storyApi, feedbackApi, Story, Feedback } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { 
  Sparkles, 
  Calendar, 
  Volume2, 
  Image as ImageIcon, 
  Music, 
  Video,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  Zap,
  ArrowRight,
  Trash2,
  Edit3
} from 'lucide-react'

const MOOD_GRADIENTS: Record<string, string> = {
  magical: 'linear-gradient(135deg, #0284c7, #3b82f6)',
  adventure: 'linear-gradient(135deg, #f97316, #ea580c)',
  funny: 'linear-gradient(135deg, #10b981, #f59e0b)',
  romantic: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  educational: 'linear-gradient(135deg, #06b6d4, #10b981)',
}

const MOOD_EMOJIS: Record<string, string> = {
  magical: '✨', adventure: '🗺️', funny: '🎭', romantic: '🌸', educational: '📚',
}

const MOOD_LABELS: Record<string, string> = {
  magical: 'Sihirli Masal',
  adventure: 'Macera Masalı',
  funny: 'Eğlenceli Masal',
  romantic: 'Duygusal Masal',
  educational: 'Eğitici Masal',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
  if (diffHours < 1) return 'Az önce'
  if (diffHours < 24) return `${Math.floor(diffHours)} saat önce`
  if (diffHours < 48) return 'Dün'
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

const FAQ_DATA = [
  {
    question: 'Masal Diyarı nasıl çalışıyor?',
    answer: 'Masal Diyarı, seçtiğiniz kahraman, mekan, tema ve verdiğiniz özel detayları gelişmiş yapay zeka modelleriyle harmanlayarak tamamen size özel, özgün ve eğlendirici masallar yazar. Aynı zamanda bu masalları seslendirir ve kapak görselleri tasarlar!'
  },
  {
    question: 'Oluşturduğum masalları daha sonra okuyabilir miyim?',
    answer: 'Evet! Oluşturduğunuz tüm masallar otomatik olarak "Kütüphane" sayfanıza kaydedilir. İstediğiniz zaman kütüphanenize giderek masallarınızı yeniden okuyabilir, seslendirmelerini dinleyebilirsiniz.'
  },
  {
    question: 'Hangi yapay zeka modelleri kullanılıyor?',
    answer: 'Masallarımız en yeni ve gelişmiş yapay zeka dil modelleri (OpenAI/Gemini) tarafından yazılır. Görseller ise DALL-E veya benzeri görsel üretim yapay zeka modelleri ile çizilerek masallarınıza eşsiz bir görsel şölen katar.'
  },
  {
    question: 'Masallar çocuklar için güvenli mi?',
    answer: 'Kesinlikle! Sistemimiz, çocukların pedagojik gelişimine uygun, güvenli, şiddet ve olumsuz ögeler içermeyen hikayeler üretecek şekilde özel güvenlik filtreleriyle donatılmıştır.'
  }
]

interface UserReactions {
  like?: boolean;
  thumbsUp?: boolean;
  stars?: boolean;
}

const getReactionsFromStorage = (): Record<string, UserReactions> => {
  try {
    const raw = localStorage.getItem('masal-dunyasi:reactions');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveReactionToStorage = (storyId: string, type: 'like' | 'thumbsUp' | 'stars', value: boolean) => {
  const all = getReactionsFromStorage();
  if (!all[storyId]) all[storyId] = {};
  all[storyId][type] = value;
  localStorage.setItem('masal-dunyasi:reactions', JSON.stringify(all));
};

export default function HomePage() {
  const [recentStories, setRecentStories] = useState<Story[]>([])
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [userReactions, setUserReactions] = useState<Record<string, UserReactions>>({})
  
  // Feedback states
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(true)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackRole, setFeedbackRole] = useState('Ebeveyn')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  // Feedback editing states
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null)
  const [editingFeedbackContent, setEditingFeedbackContent] = useState('')
  const [editingFeedbackRating, setEditingFeedbackRating] = useState(5)
  const [editingFeedbackRole, setEditingFeedbackRole] = useState('Ebeveyn')

  // Feedback deleting states
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null)

  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isLoggedIn, user, openAuthModal } = useAuth()
  const [quickPrompt, setQuickPrompt] = useState('')
  
  const handleQuickStartSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = quickPrompt.trim()
    if (query) {
      navigate(`/create?prompt=${encodeURIComponent(query)}`)
    } else {
      navigate('/create')
    }
  }

  useEffect(() => {
    storyApi.getAll()
      .then(data => {
        console.log('📚 Toplam masal:', data.length)
        // Sadece başlığı olan masalları göster, en fazla 6 tane
        const withTitle = data.filter(s => s.title && s.title.trim())
        console.log('📚 Başlıklı masal:', withTitle.length)
        setRecentStories(withTitle.slice(0, 6))
      })
      .catch(err => {
        console.error('Son masallar yüklenemedi:', err)
      })

    // Geri bildirimleri yükle
    setFeedbacksLoading(true)
    feedbackApi.getAll()
      .then(data => {
        setFeedbacks(data)
      })
      .catch(err => {
        console.error('Geri bildirimler yüklenemedi:', err)
      })
      .finally(() => {
        setFeedbacksLoading(false)
      })

    setUserReactions(getReactionsFromStorage())
  }, [])

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) {
      openAuthModal()
      showToast('Geri bildirim paylaşmak için giriş yapmalısınız! 🔑', 'info')
      return
    }
    if (!feedbackContent.trim()) {
      showToast('Lütfen yorumunuzu yazın.', 'error')
      return
    }
    if (feedbackContent.trim().length > 300) {
      showToast('Yorumunuz en fazla 300 karakter olmalıdır.', 'error')
      return
    }
    setFeedbackSubmitting(true)
    try {
      const newFb = await feedbackApi.create(
        feedbackContent.trim(),
        feedbackRating,
        feedbackRole
      )
      setFeedbacks(prev => [newFb, ...prev])
      setFeedbackContent('')
      setFeedbackRating(5)
      setFeedbackRole('Ebeveyn')
      setShowFeedbackForm(false)
      showToast('Geri bildiriminiz başarıyla paylaşıldı! Sihirli katkınız için teşekkürler. ✨💖', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Geri bildirim gönderilemedi.', 'error')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const handleFeedbackDelete = async (feedbackId: string) => {
    try {
      await feedbackApi.delete(feedbackId)
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
      setDeletingFeedbackId(null)
      showToast('Yorum başarıyla silindi. 🧹', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Yorum silinirken bir sorun oluştu.', 'error')
    }
  }

  const handleFeedbackUpdate = async (e: React.FormEvent, feedbackId: string) => {
    e.preventDefault()
    if (!editingFeedbackContent.trim()) {
      showToast('Lütfen yorumunuzu yazın.', 'error')
      return
    }
    if (editingFeedbackContent.trim().length > 300) {
      showToast('Yorumunuz en fazla 300 karakter olmalıdır.', 'error')
      return
    }

    try {
      const updated = await feedbackApi.update(
        feedbackId,
        editingFeedbackContent.trim(),
        editingFeedbackRating,
        editingFeedbackRole
      )
      setFeedbacks(prev => prev.map(f => f.id === feedbackId ? updated : f))
      setEditingFeedbackId(null)
      showToast('Yorum başarıyla güncellendi! ✨', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Yorum güncellenirken bir sorun oluştu.', 'error')
    }
  }

  const handleLike = async (e: React.MouseEvent, storyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      showToast('Reaksiyon bırakabilmek için lütfen üye olun! 🧡', 'error')
      openAuthModal()
      return
    }
    const active = !!userReactions[storyId]?.like
    try {
      const updated = active 
        ? await storyApi.unlike(storyId)
        : await storyApi.like(storyId)
      
      setRecentStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: updated.likes } : s))
      saveReactionToStorage(storyId, 'like', !active)
      setUserReactions(getReactionsFromStorage())
      
      showToast(active ? 'Beğenini geri çektin 💔' : 'Masalı beğendin! ❤️', 'success')
    } catch (err) {
      console.error(err)
      showToast('Beğenilirken bir sorun oluştu.', 'error')
    }
  }

  const handleLikeThumbsUp = async (e: React.MouseEvent, storyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      showToast('Reaksiyon bırakabilmek için lütfen üye olun! 🧡', 'error')
      openAuthModal()
      return
    }
    const active = !!userReactions[storyId]?.thumbsUp
    try {
      const updated = active 
        ? await storyApi.unlikeThumbsUp(storyId)
        : await storyApi.likeThumbsUp(storyId)
      
      setRecentStories(prev => prev.map(s => s.id === storyId ? { ...s, likesThumbsUp: updated.likesThumbsUp } : s))
      saveReactionToStorage(storyId, 'thumbsUp', !active)
      setUserReactions(getReactionsFromStorage())
      
      showToast(active ? 'Harika ifadesini geri çektin 🤷' : 'Harika buldun! 👍', 'success')
    } catch (err) {
      console.error(err)
      showToast('Beğenilirken bir sorun oluştu.', 'error')
    }
  }

  const handleLikeStars = async (e: React.MouseEvent, storyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      showToast('Reaksiyon bırakabilmek için lütfen üye olun! 🧡', 'error')
      openAuthModal()
      return
    }
    const active = !!userReactions[storyId]?.stars
    try {
      const updated = active 
        ? await storyApi.unlikeStars(storyId)
        : await storyApi.likeStars(storyId)
      
      setRecentStories(prev => prev.map(s => s.id === storyId ? { ...s, likesStars: updated.likesStars } : s))
      saveReactionToStorage(storyId, 'stars', !active)
      setUserReactions(getReactionsFromStorage())
      
      showToast(active ? 'Sihri geri çektin 🪄' : 'Masala sihir ekledin! ✨', 'success')
    } catch (err) {
      console.error(err)
      showToast('Beğenilirken bir sorun oluştu.', 'error')
    }
  }

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <>
      {/* HAREKETLİ BULUT & YILDIZ KATMANI */}
      <div className="cosmic-layer">
        <div className="floating-cloud cloud-1"></div>
        <div className="floating-cloud cloud-2"></div>
        <div className="star-glimmer star-1"></div>
        <div className="star-glimmer star-2"></div>
        <div className="star-glimmer star-3"></div>
        <div className="star-glimmer star-4"></div>
      </div>

      {/* HERO SECTION */}
      <div className="hero-badge-container" style={{ marginTop: '20px' }}>
        <span className="hero-badge">
          <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
          Hayallerini Masallara Dönüştür
        </span>
      </div>
      
      <h1 className="hero-title">
        Çocuklar İçin Yapay Zeka Destekli<br />Sihirli Masal Diyarı
      </h1>
      <p className="hero-sub" style={{ marginBottom: '32px' }}>
        Kendi kahramanını seç, dünyanı belirle ve anında kişiselleştirilmiş, görsel kapaklı ve seslendirmeli masalları keşfetmeye başla!
      </p>

      {/* İNTERAKTİF HIZLI BAŞLANGIÇ KARTI */}
      <form onSubmit={handleQuickStartSubmit} className="hero-quick-start-card">
        <div className="quick-start-title-box">
          <Sparkles size={18} style={{ color: 'var(--secondary)' }} />
          <h3 className="quick-start-title">Hızlı Masal Odası — Aklındaki fikri yaz, gerisini sihre bırak!</h3>
        </div>
        <div className="quick-start-textarea-wrapper">
          <textarea
            className="quick-start-textarea"
            placeholder="Nasıl bir masal hayal ediyorsun? (Örn: Çikolata yemeyi çok seven tatlı bir ejderha bulut şatosunda kaybolmuş...)"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
          />
        </div>
        <div className="quick-start-tags-label">veya sihirli hazır konulardan birini seç:</div>
        <div className="quick-start-tags-container">
          {[
            'Uykusu kaçan tatlı ejderha 🐉',
            'Uzayda kaybolan ve şarkı söyleyen robot 🤖',
            'Bulut şatosundaki gizemli kütüphane 🏰',
            'Şeker köyünün kayıp renkli taşları 🍬'
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              className="quick-start-tag"
              onClick={() => setQuickPrompt(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <button type="submit" className="quick-start-btn">
          <span>Sihirli Masal Odasına Gir & Yaz</span>
          <ArrowRight size={18} />
        </button>
      </form>

      {/* DETAYLI ÖZELLİKLER BÖLÜMÜ */}
      <div style={{ margin: '40px 0 80px' }}>
        <h3 className="section-subtitle-center" style={{ fontSize: '32px', marginBottom: '40px' }}>
          🌟 Masal Diyarı Neler Sunuyor?
        </h3>
        <div className="steps-grid">
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="step-icon" style={{ background: 'rgba(2, 132, 199, 0.08)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Zap size={32} style={{ color: 'var(--primary)' }} />
            </div>
            <h4 className="step-title" style={{ fontSize: '20px', fontWeight: '700' }}>Kişiselleştirilmiş Hikaye</h4>
            <p className="step-desc">Seçtiğiniz karakter ve mekana uygun olarak yapay zeka benzersiz maceralar kaleme alır.</p>
          </div>
          
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="step-icon" style={{ background: 'rgba(249, 115, 22, 0.08)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Sparkles size={32} style={{ color: 'var(--secondary)' }} />
            </div>
            <h4 className="step-title" style={{ fontSize: '20px', fontWeight: '700' }}>AI Kapak Çizimi & Ses</h4>
            <p className="step-desc">Masalınıza özel görseller tasarlanır ve sesli okuma entegrasyonu ile dinleme keyfi sunulur.</p>
          </div>
          
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="step-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={32} style={{ color: 'var(--success)' }} />
            </div>
            <h4 className="step-title" style={{ fontSize: '20px', fontWeight: '700' }}>%100 Güvenli İçerik</h4>
            <p className="step-desc">Gelişmiş güvenlik filtreleriyle pedagojik açıdan tamamen temiz ve eğitici masallar üretilir.</p>
          </div>
        </div>
      </div>

      {/* NASIL ÇALIŞIR BÖLÜMÜ */}
      <div className="how-it-works" style={{ margin: '80px 0' }}>
        <h3 className="section-subtitle-center" style={{ fontSize: '32px' }}>✨ Sihir Nasıl Gerçekleşiyor?</h3>
        <div className="steps-grid">
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="step-number" style={{ background: 'var(--primary)' }}>1</div>
            <div className="step-icon" style={{ fontSize: '36px' }}>✍️</div>
            <h4 className="step-title">Hayal Et & Seç</h4>
            <p className="step-desc">Kahramanını, geçeceği mekanı ve masalın temasını belirle veya detayları yaz.</p>
          </div>
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="step-number" style={{ background: 'var(--secondary)' }}>2</div>
            <div className="step-icon" style={{ fontSize: '36px' }}>🧙</div>
            <h4 className="step-title">Yapay Zeka Yazsın</h4>
            <p className="step-desc">Gelişmiş modeller saniyeler içinde masalını yazıp, kapak resmini çizsin.</p>
          </div>
          <div className="step-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="step-number" style={{ background: '#10b981' }}>3</div>
            <div className="step-icon" style={{ fontSize: '36px' }}>🎧</div>
            <h4 className="step-title">Oku, Dinle, İzle</h4>
            <p className="step-desc">Masalını sesli olarak dinle, rengarenk görseline göz at veya kütüphanene kaydet.</p>
          </div>
        </div>
      </div>

      {/* SİHİRLİ İSTATİSTİKLER BANDI (YENİ YERİ) */}
      <div className="stats-band" style={{ marginBottom: '80px' }}>
        <div className="stats-item">
          <div className="stats-number">50,000+</div>
          <div className="stats-label">Anlatılan Masal</div>
          <div className="stats-desc">Yapay zeka büyüsüyle yazılan özgün masallar</div>
        </div>
        <div className="stats-item">
          <div className="stats-number">15,000+</div>
          <div className="stats-label">Mutlu Çocuk</div>
          <div className="stats-desc">Uyumadan önce masallarla buluşan minikler</div>
        </div>
        <div className="stats-item">
          <div className="stats-number">500+</div>
          <div className="stats-label">Özgün Karakter</div>
          <div className="stats-desc">Ejderhalardan astronotlara sihirli dostlar</div>
        </div>
      </div>

      {/* SON MASALLAR GRİDİ */}
      {recentStories.length > 0 && (
        <div className="recent-tales-section" style={{ margin: '80px 0' }}>
          <div className="recent-tales-header">
            <h3 className="recent-tales-title" style={{ fontSize: '32px' }}>📚 Son Üretilen Sihirli Masallar</h3>
            <Link to="/library" className="view-all-link">
              <span>Kitaplığın Tamamı</span>
              <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="library-grid">
            {recentStories.map(s => {
              const mood = s.mood || 'magical'
              const emoji = MOOD_EMOJIS[mood] || '✨'
              const gradient = MOOD_GRADIENTS[mood] || MOOD_GRADIENTS.magical
              const category = MOOD_LABELS[mood] || 'Masal'
              
              return (
                <Link to={`/story/${s.id}`} key={s.id} className="lib-card" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="lib-card-cover" style={{ background: gradient }}>
                    <div className="cover-category-badge">{category}</div>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.title} />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>
                  
                  <div className="lib-card-body">
                    <div className="lib-card-title">{s.title || 'Başlıksız Masal'}</div>
                    
                    <div className="lib-card-meta">
                      <span className="meta-author">Masal Diyarı</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-date">{formatDate(s.createdAt)}</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-comments">💬 {s.commentsCount || 0}</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-views">👁️ {s.views || 0}</span>
                    </div>

                    <p className="lib-card-summary">
                      {s.summary || (s.content ? `${s.content.slice(0, 110)}...` : 'Sihirli bir yapay zeka masalı.')}
                    </p>
                    
                    <div className="media-icons" style={{ marginBottom: '14px' }}>
                      {s.audioUrl && (
                        <div className="media-dot dot-audio" title="Seslendirme Hazır">
                          <Volume2 size={12} />
                        </div>
                      )}
                      {s.imageUrl && (
                        <div className="media-dot dot-image" title="Görsel Hazır">
                          <ImageIcon size={12} />
                        </div>
                      )}
                      {s.musicUrl && (
                        <div className="media-dot dot-music" title="Müzik Hazır">
                          <Music size={12} />
                        </div>
                      )}
                      {s.videoUrl && (
                        <div className="media-dot dot-video" title="Animasyon Hazır">
                          <Video size={12} />
                        </div>
                      )}
                    </div>

                    {/* Instagram Beğeni & İfade Barı */}
                    <div className="card-reaction-bar" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <button className={`reaction-btn ${s.likes > 0 ? 'liked' : ''}`} onClick={(e) => handleLike(e, s.id)} title="Beğen">
                        <span>❤️</span>
                        <span>{s.likes || 0}</span>
                      </button>
                      <button className={`reaction-btn ${s.likesThumbsUp > 0 ? 'liked' : ''}`} onClick={(e) => handleLikeThumbsUp(e, s.id)} title="Harika">
                        <span>👍</span>
                        <span>{s.likesThumbsUp || 0}</span>
                      </button>
                      <button className={`reaction-btn ${s.likesStars > 0 ? 'liked' : ''}`} onClick={(e) => handleLikeStars(e, s.id)} title="Sihirli">
                        <span>✨</span>
                        <span>{s.likesStars || 0}</span>
                      </button>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* EBEVEYN YORUMLARI BÖLÜMÜ */}
      <div className="testimonials-section">
        <h3 className="section-subtitle-center" style={{ fontSize: '32px' }}>💬 Mutlu Ailelerimizin Yorumları</h3>
        
        {feedbacksLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Sihirli yorumlar yükleniyor...</span>
          </div>
        ) : (
          <>
            <div className="testimonials-grid">
              {feedbacks.map((fb) => {
                const authorName = fb.user?.name || fb.user?.email || 'Gizemli Aile'
                const initials = authorName.slice(0, 2).toUpperCase()
                return (
                  <div key={fb.id} className="testimonial-card" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                    {editingFeedbackId === fb.id ? (
                      <form onSubmit={(e) => handleFeedbackUpdate(e, fb.id)} style={{ width: '100%' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px' }}>Yorumu Düzenle</h4>
                        
                        {/* Rating */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Puan</label>
                          <div style={{ display: 'flex', gap: '4px', fontSize: '20px', cursor: 'pointer' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                onClick={() => setEditingFeedbackRating(star)}
                                style={{ color: star <= editingFeedbackRating ? '#f59e0b' : '#d1d5db' }}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Rol */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px' }}>Rol</label>
                          <select 
                            value={editingFeedbackRole} 
                            onChange={(e) => setEditingFeedbackRole(e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-solid)', color: 'var(--text-main)', fontSize: '13px' }}
                          >
                            <option value="Ebeveyn">Ebeveyn</option>
                            <option value="Anne">Anne</option>
                            <option value="Baba">Baba</option>
                            <option value="Öğretmen">Öğretmen</option>
                            <option value="Pedagog">Pedagog</option>
                            <option value="Çocuk">Çocuk</option>
                          </select>
                        </div>

                        {/* Content */}
                        <div style={{ marginBottom: '12px' }}>
                          <textarea
                            value={editingFeedbackContent}
                            onChange={(e) => setEditingFeedbackContent(e.target.value)}
                            maxLength={300}
                            required
                            rows={3}
                            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', resize: 'vertical' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            type="button" 
                            className="chip" 
                            onClick={() => setEditingFeedbackId(null)}
                            style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--bg-cosmic)' }}
                          >
                            Vazgeç
                          </button>
                          <button 
                            type="submit" 
                            className="cta-btn" 
                            style={{ maxWidth: '100px', padding: '6px 12px', fontSize: '12px' }}
                          >
                            Kaydet
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            {/* Yıldız Puanı */}
                            <div style={{ color: '#f59e0b', fontSize: '18px' }}>
                              {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                            </div>

                            {/* Düzenleme ve Silme Butonları */}
                            {isLoggedIn && (user?.id === fb.userId || user?.role === 'ADMIN') && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                                {deletingFeedbackId === fb.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Silinsin mi?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleFeedbackDelete(fb.id)}
                                      style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                      Evet
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingFeedbackId(null)}
                                      style={{ background: 'none', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                                    >
                                      Hayır
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingFeedbackId(fb.id)
                                        setEditingFeedbackContent(fb.content)
                                        setEditingFeedbackRating(fb.rating)
                                        setEditingFeedbackRole(fb.role)
                                        setDeletingFeedbackId(null)
                                      }}
                                      title="Yorumu Düzenle"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '2px' }}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingFeedbackId(fb.id)}
                                      title="Yorumu Sil"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="testimonial-text" style={{ color: 'var(--text-main)', fontSize: '14.5px', lineHeight: '1.6', marginBottom: '16px', fontStyle: 'normal' }}>
                            "{fb.content}"
                          </p>
                        </div>
                        <div className="testimonial-user" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '10px' }}>
                          <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#ffffff', fontWeight: 'bold' }}>
                            {initials}
                          </div>
                          <div className="testimonial-info">
                            <span className="testimonial-name" style={{ fontWeight: '800', color: 'var(--text-main)' }}>{authorName}</span>
                            <span className="testimonial-role" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fb.role}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* İnteraktif Form Alanı */}
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              {!showFeedbackForm ? (
                <button 
                  className="cta-btn" 
                  onClick={() => {
                    if (!isLoggedIn) {
                      openAuthModal();
                      showToast('Geri bildirim yazmak için lütfen giriş yapın veya üye olun! 🔑', 'info');
                    } else {
                      setShowFeedbackForm(true);
                    }
                  }}
                  style={{ maxWidth: '280px', margin: '0 auto' }}
                >
                  <span>Deneyimini Paylaş ✍️</span>
                </button>
              ) : (
                <div className="feedback-form-card" style={{ maxWidth: '600px', margin: '20px auto 0', background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '30px', boxShadow: 'var(--shadow-lg)', textAlign: 'left' }}>
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>✨ Görüşlerinizi Paylaşın</h4>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>Masal Diyarı hakkındaki deneyimleriniz bizim için çok kıymetli. Miniklerin ve sizin maceralarınızı duymak istiyoruz!</p>
                  
                  <form onSubmit={handleFeedbackSubmit}>
                    {/* Puan Seçimi */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)' }}>Sihirli Puanınız</label>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '28px', cursor: 'pointer' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            onClick={() => setFeedbackRating(star)}
                            style={{ 
                              color: star <= feedbackRating ? '#f59e0b' : '#d1d5db',
                              transition: 'color 0.2s',
                              transform: 'scale(1)',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rol Seçimi */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)' }}>Rolünüz</label>
                      <select 
                        value={feedbackRole} 
                        onChange={(e) => setFeedbackRole(e.target.value)}
                        style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--bg-card-solid)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}
                      >
                        <option value="Ebeveyn">Ebeveyn</option>
                        <option value="Anne">Anne</option>
                        <option value="Baba">Baba</option>
                        <option value="Öğretmen">Öğretmen</option>
                        <option value="Pedagog">Pedagog</option>
                        <option value="Çocuk">Çocuk</option>
                      </select>
                    </div>

                    {/* Yorum */}
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>Deneyiminiz / Yorumunuz</label>
                        <span style={{ fontSize: '12px', color: feedbackContent.length > 300 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {feedbackContent.length}/300
                        </span>
                      </div>
                      <textarea
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                        placeholder="Bu platformu nasıl buldunuz? Size veya çocuğunuza nasıl faydası oldu?"
                        maxLength={300}
                        required
                        rows={4}
                        style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', fontSize: '14px', resize: 'vertical', lineHeight: '1.5' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="chip" 
                        onClick={() => {
                          setShowFeedbackForm(false);
                          setFeedbackContent('');
                          setFeedbackRating(5);
                          setFeedbackRole('Ebeveyn');
                        }}
                        style={{ padding: '10px 20px', background: 'var(--bg-cosmic)' }}
                      >
                        Vazgeç
                      </button>
                      <button 
                        type="submit" 
                        className="cta-btn" 
                        disabled={feedbackSubmitting || !feedbackContent.trim()}
                        style={{ maxWidth: '180px', padding: '10px 20px' }}
                      >
                        <span>Gönder ✨</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* SIKÇA SORULAN SORULAR */}
      <div className="faq-section" style={{ margin: '80px auto' }}>
        <h3 className="faq-title" style={{ fontSize: '32px' }}>✨ Sıkça Sorulan Sorular</h3>
        <div className="faq-list">
          {FAQ_DATA.map((item, idx) => (
            <div key={idx} className={`faq-item ${openFaqIndex === idx ? 'active' : ''}`} style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
              <div className="faq-question" onClick={() => toggleFaq(idx)}>
                <div className="faq-question-text">
                  <span style={{ color: 'var(--primary)' }}>🤔</span>
                  <span>{item.question}</span>
                </div>
                <ChevronRight size={18} className="faq-icon" />
              </div>
              {openFaqIndex === idx && (
                <div className="faq-answer" style={{ background: 'var(--bg-cosmic)' }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
