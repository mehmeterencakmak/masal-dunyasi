import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Star, Trash2, Brush, BookOpen, Smile, Award } from 'lucide-react'
import { artworkApi, Artwork, ArtworkReaction } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const REACTION_TYPES = [
  { type: 'HEART' as const, emoji: '❤️', label: 'Sevgi' },
  { type: 'STAR' as const, emoji: '⭐', label: 'Harika' },
  { type: 'CLAP' as const, emoji: '👏', label: 'Tebrik' },
  { type: 'LIKE' as const, emoji: '👍', label: 'Beğeni' },
]

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [loading, setLoading] = useState(true)
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchArtworks()
  }, [])

  const fetchArtworks = async () => {
    setLoading(true)
    try {
      const data = await artworkApi.getAll()
      setArtworks(data)
    } catch (err: any) {
      showToast(err.message || 'Galeri yüklenirken hata oluştu.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Bu harika eseri silmek istediğinden emin misin? 🥺')
    if (!confirmDelete) return

    try {
      await artworkApi.delete(id)
      showToast('Eser başarıyla silindi. 🧹', 'success')
      setArtworks(artworks.filter((a) => a.id !== id))
    } catch (err: any) {
      showToast(err.message || 'Eser silinirken bir hata oluştu.', 'error')
    }
  }

  const handleReact = async (id: string, type: 'LIKE' | 'HEART' | 'STAR' | 'CLAP') => {
    if (!isLoggedIn) {
      showToast('İfade bırakabilmek için giriş yapmalısınız! 🔑', 'info')
      return
    }

    try {
      const result = await artworkApi.react(id, type)
      
      // Local state'i güncelle
      setArtworks(prevArtworks =>
        prevArtworks.map(art => {
          if (art.id !== id) return art

          let updatedReactions = [...(art.reactions || [])]
          if (result.active) {
            // Reaksiyon eklendi
            updatedReactions.push({
              id: Math.random().toString(), // Geçici benzersiz id
              artworkId: id,
              userId: user!.id,
              type,
              createdAt: new Date().toISOString()
            })
          } else {
            // Reaksiyon kaldırıldı
            updatedReactions = updatedReactions.filter(
              r => !(r.userId === user!.id && r.type === type)
            )
          }

          return {
            ...art,
            reactions: updatedReactions
          }
        })
      )
    } catch (err: any) {
      showToast(err.message || 'İfade kaydedilirken bir hata oluştu.', 'error')
    }
  }

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url
    return `http://localhost:3001${url}`
  }

  // Aktif filtrelenmiş listeyi oluştur
  const displayedArtworks = artworks.filter((art) => {
    if (filter === 'mine') {
      return isLoggedIn && art.userId === user?.id
    }
    return true
  })

  // Bir reaksiyonun aktif (oturum açmış kullanıcı tarafından tıklanmış) olup olmadığını bulur
  const isReactionActive = (reactions: ArtworkReaction[] = [], type: string) => {
    if (!isLoggedIn || !user) return false
    return reactions.some((r) => r.userId === user.id && r.type === type)
  }

  // Belirli bir reaksiyon türünün sayısını bulur
  const getReactionCount = (reactions: ArtworkReaction[] = [], type: string) => {
    return reactions.filter((r) => r.type === type).length
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', minHeight: '80vh' }}>
      
      {/* Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
          Sihirli Sanat Galerisi 🎨
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Çocukların ve hayalperestlerin sihirli fırçalarla renklendirdiği birbirinden güzel masal dünyası şaheserleri!
        </p>
      </div>

      {/* Filter Tabs */}
      {isLoggedIn && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
          <button
            onClick={() => setFilter('all')}
            className={`speed-btn ${filter === 'all' ? 'active' : ''}`}
            style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: '600' }}
          >
            Tüm Şaheserler 🌍
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`speed-btn ${filter === 'mine' ? 'active' : ''}`}
            style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: '600' }}
          >
            Benim Eserlerim 🎨
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(168,85,247,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        </div>
      ) : displayedArtworks.length === 0 ? (
        /* Empty State */
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-cosmic)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', maxWidth: '600px', margin: '0 auto' }}>
          <Smile size={48} style={{ color: 'var(--secondary)', marginBottom: '16px' }} />
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
            Burada Henüz Bir Şey Yok
          </h4>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {filter === 'mine' 
              ? 'Henüz hiçbir boyamanı galeriye kaydetmedin. Bir masal oku ve boyamaya başla!' 
              : 'Henüz hiçbir şaheser galeriye gönderilmemiş. İlk şaheseri sen paylaşmak ister misin?'}
          </p>
          <button
            onClick={() => navigate('/library')}
            style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' }}
          >
            Masal Kitaplığına Git 📚
          </button>
        </div>
      ) : (
        /* Artworks Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '28px' }}>
          {displayedArtworks.map((art) => {
            const isOwner = isLoggedIn && art.userId === user?.id
            const isAdmin = isLoggedIn && user?.role === 'ADMIN'
            const authorName = art.user?.name || art.user?.email || 'Gizemli Sanatçı'

            return (
              <div
                key={art.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
                className="interactive-card"
              >
                {/* Artwork Image */}
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={getImageUrl(art.imageUrl)}
                    alt={art.story?.title || 'Boyama'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Story Title & Author */}
                  <div style={{ marginBottom: '16px' }}>
                    <span
                      onClick={() => navigate(`/story/${art.storyId}`)}
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '4px'
                      }}
                    >
                      <BookOpen size={10} />
                      {art.story?.title || 'Masal Sahnesi'}
                    </span>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', display: 'block', margin: 0 }}>
                      Çizen: {authorName}
                    </h4>
                  </div>

                  {/* Reaction Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    {REACTION_TYPES.map((react) => {
                      const active = isReactionActive(art.reactions, react.type)
                      const count = getReactionCount(art.reactions, react.type)

                      return (
                        <button
                          key={react.type}
                          onClick={() => handleReact(art.id, react.type)}
                          style={{
                            background: active ? 'rgba(168,85,247,0.1)' : 'var(--bg-input)',
                            border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '100px',
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: active ? 'var(--primary)' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                          }}
                          title={react.label}
                        >
                          <span>{react.emoji}</span>
                          <span>{count}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Owner & Admin Action Buttons */}
                  {(isOwner || isAdmin) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      {isOwner && (
                        <button
                          onClick={() => navigate(`/story/${art.storyId}`)}
                          style={{
                            flex: 1,
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <Brush size={12} />
                          Yeniden Boya
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(art.id)}
                        style={{
                          flex: isOwner ? '0 0 38px' : 1,
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'background 0.2s'
                        }}
                        title="Eseri Sil"
                      >
                        <Trash2 size={12} />
                        {!isOwner && 'Eseri Yönetici Olarak Sil'}
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
