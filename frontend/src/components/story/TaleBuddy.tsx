import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, MessageCircle, AlertCircle, Loader2 } from 'lucide-react'
import { storyApi } from '../../services/api'
import { useToast } from '../ui/Toast'

interface TaleBuddyProps {
  storyId: string
  storyTitle: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const BUDDIES = {
  owl: {
    id: 'owl' as const,
    name: 'Bilge Baykuş',
    emoji: '🦉',
    color: '#8b5cf6', // mor
    bgColor: 'rgba(139, 92, 246, 0.05)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
    greeting: 'Merhaba ufaklık! Ben Bilge Baykuş. Okuduğun bu masal hakkında sohbet etmeye ne dersin? Sence masaldaki en bilgece karar neydi? 🦉✨'
  },
  dragon: {
    id: 'dragon' as const,
    name: 'Şirin Ejderha',
    emoji: '🐉',
    color: '#f97316', // turuncu
    bgColor: 'rgba(242, 193, 78, 0.05)',
    borderColor: 'rgba(242, 193, 78, 0.2)',
    greeting: 'Heeey! Selam! Ben Şirin Ejderha! Hikaye bitti ama eğlence bitmedi! Birlikte masal hakkında konuşalım mı? Sence kahramanımız sihirli ormanda uçarken neler hissetti? Uçmak çok havalı değil mi? Yeeey! 🐉🔥'
  }
}

type BuddyKey = keyof typeof BUDDIES

export default function TaleBuddy({ storyId, storyTitle }: TaleBuddyProps) {
  const [selectedBuddy, setSelectedBuddy] = useState<BuddyKey | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Otomatik aşağı kaydırma
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const selectBuddy = (key: BuddyKey) => {
    setSelectedBuddy(key)
    setMessages([
      { role: 'assistant', content: BUDDIES[key].greeting }
    ])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedBuddy || loading) return

    const userMessage = input.trim()
    setInput('')

    // Kullanıcı mesajını ekle
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      // API'ye gönder (tüm geçmişi de yolluyoruz ki bağlamı kaybetmesin)
      const data = await storyApi.chat(storyId, userMessage, selectedBuddy, messages)
      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      showToast('Sihir dünyasından cevap alınamadı. 🪄', 'error')
      setMessages([...updatedMessages, { role: 'assistant', content: 'Üzgünüm ufaklık, şu an sihirli sinyallerimde bir sorun var, daha sonra tekrar dener misin? 🌪️' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="comment-section" style={{ marginTop: '40px', background: 'var(--bg-cosmic)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Sparkles size={20} style={{ color: 'var(--secondary)' }} />
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>AI Masal Arkadaşı</h3>
      </div>

      {/* Selector Screen */}
      {!selectedBuddy ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Masalın bitti mi? Harika! Şimdi masal hakkında sohbet etmek için bir yol arkadaşı seçebilirsin:
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {(Object.keys(BUDDIES) as BuddyKey[]).map(key => {
              const buddy = BUDDIES[key]
              return (
                <button
                  key={buddy.id}
                  onClick={() => selectBuddy(key)}
                  className="interactive-card"
                  style={{
                    width: '180px',
                    padding: '24px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${buddy.borderColor}`,
                    background: 'var(--bg-card-solid)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 10px 20px -5px ${buddy.color}15`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <span style={{ fontSize: '48px' }}>{buddy.emoji}</span>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>{buddy.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.3' }}>
                    {buddy.id === 'owl' ? 'Düşündürücü Sorular 🦉' : 'Eğlenceli Sohbetler 🐉'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Chat Screen */
        <div style={{ display: 'flex', flexDirection: 'column', height: '400px', background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-cosmic)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>{BUDDIES[selectedBuddy].emoji}</span>
              <div>
                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>{BUDDIES[selectedBuddy].name}</span>
                <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  aktif sohbet
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedBuddy(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
            >
              Karakter Değiştir
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: '1', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-input)' }}>
            {messages.map((msg, i) => {
              const isAssistant = msg.role === 'assistant'
              return (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  {isAssistant && (
                    <div style={{ fontSize: '24px', padding: '2px', background: 'var(--bg-card-solid)', borderRadius: '50%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                      {BUDDIES[selectedBuddy].emoji}
                    </div>
                  )}
                  <div 
                    style={{ 
                      maxWidth: '75%', 
                      padding: '12px 16px', 
                      borderRadius: isAssistant ? '0 16px 16px 16px' : '16px 0 16px 16px',
                      background: isAssistant ? 'var(--bg-card-solid)' : 'var(--primary)',
                      color: isAssistant ? 'var(--text-main)' : '#ffffff',
                      border: isAssistant ? '1px solid var(--border)' : 'none',
                      fontSize: '13.5px',
                      lineHeight: '1.45',
                      boxShadow: isAssistant ? 'var(--shadow-sm)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            
            {/* Loading / Typing Indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '24px', padding: '2px', background: 'var(--bg-card-solid)', borderRadius: '50%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  {BUDDIES[selectedBuddy].emoji}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 16px', background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: '0 16px 16px 16px', boxShadow: 'var(--shadow-sm)' }}>
                  <Loader2 className="spinner" size={14} style={{ color: BUDDIES[selectedBuddy].color }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Düşünüyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} style={{ display: 'flex', padding: '10px', borderTop: '1px solid var(--border)', background: 'var(--bg-card-solid)' }}>
            <input
              type="text"
              className="auth-input"
              placeholder={`${BUDDIES[selectedBuddy].name} ile konuş...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              required
              style={{ flex: '1', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '10px 14px', outline: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '13.5px' }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: BUDDIES[selectedBuddy].color,
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                width: '40px',
                height: '40px',
                marginLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: loading || !input.trim() ? 0.6 : 1,
                transition: 'opacity 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
