// ─── KÜTÜPHANE SAYFASI ────────────────────────────────
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storyApi, Story } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import CustomSelect from '../components/ui/CustomSelect'
import NightCover from '../components/story/NightCover'
import { 
  Volume2, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Trash2, 
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Heart,
  ThumbsUp,
  Plus
} from 'lucide-react'

const MOOD_GRADIENTS: Record<string, string> = {
  magical: '#1E2858',
  adventure: '#1E2858',
  funny: '#1E2858',
  romantic: '#1E2858',
  educational: '#1E2858',
}

const MOOD_FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'magical', label: 'Sihirli' },
  { value: 'adventure', label: 'Macera' },
  { value: 'funny', label: 'Eğlenceli' },
  { value: 'romantic', label: 'Duygusal' },
  { value: 'educational', label: 'Eğitici' },
]

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

export default function LibraryPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [userReactions, setUserReactions] = useState<Record<string, UserReactions>>({})
  const { showToast } = useToast()
  const { isLoggedIn, openAuthModal, user } = useAuth()

  // Pagination, Filter & Sort states
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const itemsPerPage = 12

  useEffect(() => {
    loadStories()
    setUserReactions(getReactionsFromStorage())
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedMood, sortBy])

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
      
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: updated.likes } : s))
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
      
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, likesThumbsUp: updated.likesThumbsUp } : s))
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
      
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, likesStars: updated.likesStars } : s))
      saveReactionToStorage(storyId, 'stars', !active)
      setUserReactions(getReactionsFromStorage())
      
      showToast(active ? 'Sihri geri çektin 🪄' : 'Masala sihir ekledin! ✨', 'success')
    } catch (err) {
      console.error(err)
      showToast('Beğenilirken bir sorun oluştu.', 'error')
    }
  }

  const loadStories = () => {
    setLoading(true)
    storyApi.getAll()
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setLoading(false))
  }

  const handleDelete = async (e: React.MouseEvent, story: Story) => {
    e.preventDefault()
    e.stopPropagation()
    
    const isOwner = isLoggedIn && user && (story.userId === user.id || user.role === 'ADMIN');
    
    if (!isOwner) {
      showToast('Bu masalı silme yetkiniz bulunmuyor. Yalnızca masalı oluşturan kişi düzenleyebilir veya silebilir! 🧙‍♂️🔒', 'error')
      return
    }
    
    if (window.confirm('Bu masalı sihirli kitaplığından tamamen silmek istediğine emin misin?')) {
      try {
        await storyApi.delete(story.id)
        setStories(prev => prev.filter(s => s.id !== story.id))
        showToast('Masal kütüphaneden başarıyla silindi. 🧹', 'success')
      } catch (err) {
        showToast('Masal silinirken bir sorun oluştu.', 'error')
      }
    }
  }

  // Filtreleme ve Sıralama
  const filteredAndSortedStories = stories
    .filter(s => {
      const title = s.title || ''
      const summary = s.summary || ''
      const query = searchQuery.trim().toLowerCase()
      
      const matchesSearch = title.toLowerCase().includes(query) || summary.toLowerCase().includes(query)
      const matchesMood = selectedMood === 'all' || s.mood === selectedMood
      return matchesSearch && matchesMood
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      if (sortBy === 'popular') {
        return (b.views || 0) - (a.views || 0)
      }
      if (sortBy === 'likes') {
        const scoreA = (a.likes || 0) + (a.likesThumbsUp || 0) + (a.likesStars || 0)
        const scoreB = (b.likes || 0) + (b.likesThumbsUp || 0) + (b.likesStars || 0)
        return scoreB - scoreA
      }
      return 0
    })

  // Sayfalama (Pagination) hesaplama
  const indexOfLastStory = currentPage * itemsPerPage
  const indexOfFirstStory = indexOfLastStory - itemsPerPage
  const currentStories = filteredAndSortedStories.slice(indexOfFirstStory, indexOfLastStory)
  const totalPages = Math.ceil(filteredAndSortedStories.length / itemsPerPage)

  const pageNumbers = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-emoji">📚</div>
        <div className="loading-text">Kütüphane Rafları Düzenleniyor...</div>
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <>
        <h2 className="section-label">📚 Sihirli Kitaplığım</h2>
        <div className="empty-state">
          <div className="empty-state-icon"><NightCover /></div>
          <div className="empty-state-text">
            Henüz burada hiç masalın yok. Ana sayfaya git ve ilk masalını yazmaya başla!
          </div>
          <Link to="/create" className="chip" style={{ margin: '0 auto' }}>
            <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
            <span>Yeni Masal Yaz</span>
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="library-head">
        <div>
          <h1 className="library-title">Sihirli Kitaplığım</h1>
          <p className="library-count">{filteredAndSortedStories.length} masal rafta seni bekliyor</p>
        </div>
        <Link to="/create" className="cta-btn library-new-btn">
          <Plus size={20} />
          <span>Yeni Masal Yaz</span>
        </Link>
      </div>

      {/* Arama, Filtre ve Sıralama Paneli */}
      <div className="library-filters-container" style={{ position: 'relative', zIndex: 100 }}>
        <div className="filter-search-wrapper">
          <Search className="filter-search-icon" size={18} />
          <input 
            type="text" 
            className="filter-search-input"
            placeholder="Masal başlığı veya özetinde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-select-group">

          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            minWidth={165}
            options={[
              { value: 'newest',  label: 'En yeni' },
              { value: 'oldest',  label: 'En eski' },
              { value: 'popular', label: 'En popüler' },
              { value: 'likes',   label: 'En çok beğenilen' },
            ]}
          />
        </div>
      </div>
      
      <div className="library-mood-pills" role="group" aria-label="Temaya göre filtrele">
        {MOOD_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            aria-pressed={selectedMood === f.value}
            className={`create-pill ${selectedMood === f.value ? 'selected' : ''}`}
            onClick={() => setSelectedMood(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredAndSortedStories.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 40px', marginTop: '20px' }}>
          <div className="empty-state-icon"><Search size={40} /></div>
          <div className="empty-state-text">Aradığınız kriterlere uygun masal bulunamadı. Filtreleri temizlemeyi deneyin!</div>
          <button 
            className="chip" 
            onClick={() => {
              setSearchQuery('')
              setSelectedMood('all')
              setSortBy('newest')
            }}
            style={{ margin: '0 auto' }}
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <>
          <div className="library-grid">
            {currentStories.map(s => {
              const mood = s.mood || 'magical'
              const gradient = MOOD_GRADIENTS[mood] || MOOD_GRADIENTS.magical
              const category = MOOD_LABELS[mood] || 'Masal'
              
              return (
                <Link to={`/story/${s.id}`} key={s.id} className="lib-card">
                  <div className="lib-card-cover" style={{ background: gradient }}>
                    <div className="cover-category-badge">{category}</div>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.title} />
                    ) : (
                      <NightCover />
                    )}
                    
                    {/* Silme Butonu */}
                    {(() => {
                      const isOwner = isLoggedIn && user && (s.userId === user.id || user.role === 'ADMIN');
                      return (
                        <button 
                          className={`lib-card-delete ${!isOwner ? 'restricted' : ''}`}
                          onClick={(e) => handleDelete(e, s)}
                          title={isOwner ? "Masalı Sil" : "Masal Kilitli (Sadece yazarı silebilir)"}
                        >
                          {isOwner ? <Trash2 size={14} /> : <Lock size={14} />}
                        </button>
                      );
                    })()}
                  </div>
                  
                  <div className="lib-card-body">
                    <div className="lib-card-title">{s.title || 'Başlıksız Masal'}</div>
                    
                    <div className="lib-card-meta">
                      <span className="meta-author">Masal Diyarı</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-date">{formatDate(s.createdAt)}</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-comments">{s.commentsCount || 0} yorum</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-views">{s.views || 0} okunma</span>
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
                      <button className={`reaction-btn ${userReactions[s.id]?.like ? 'liked' : ''}`} onClick={(e) => handleLike(e, s.id)} title="Beğen">
                        <Heart size={15} />
                        <span>{s.likes || 0}</span>
                      </button>
                      <button className={`reaction-btn ${userReactions[s.id]?.thumbsUp ? 'liked' : ''}`} onClick={(e) => handleLikeThumbsUp(e, s.id)} title="Harika">
                        <ThumbsUp size={15} />
                        <span>{s.likesThumbsUp || 0}</span>
                      </button>
                      <button className={`reaction-btn ${userReactions[s.id]?.stars ? 'liked' : ''}`} onClick={(e) => handleLikeStars(e, s.id)} title="Sihirli">
                        <Sparkles size={15} />
                        <span>{s.likesStars || 0}</span>
                      </button>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Sayfalama Kontrolleri */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                <span>Önceki</span>
              </button>
              
              {pageNumbers.map(number => (
                <button
                  key={number}
                  className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                  onClick={() => setCurrentPage(number)}
                >
                  {number}
                </button>
              ))}
              
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Sonraki</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
