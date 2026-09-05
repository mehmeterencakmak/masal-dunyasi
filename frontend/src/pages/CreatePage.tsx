import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { storyApi } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { Wand2, Sparkles } from 'lucide-react'

const HERO_OPTIONS = [
  { id: 'dragon', label: 'Ejderha 🐉', emoji: '🐉', desc: 'Ateş yerine sevgi saçan dostumuz', badge: 'Popüler' },
  { id: 'robot', label: 'Robot 🤖', emoji: '🤖', desc: 'Uzay gezgini tatlı teneke kutusu', badge: 'Yeni' },
  { id: 'unicorn', label: 'Unicorn 🦄', emoji: '🦄', desc: 'Gökkuşağı yeleli efsanevi at', badge: 'Popüler' },
  { id: 'astronaut', label: 'Astronot 👩‍🚀', emoji: '👩‍🚀', desc: 'Bilinmeyen galaksilerin kaşifi', badge: '' },
  { id: 'fox', label: 'Akıllı Tilki 🦊', emoji: '🦊', desc: 'Her bilmeceyi çözen kurnaz dost', badge: '' },
  { id: 'custom', label: 'Kendin Yaz ✍️', emoji: '✍️', desc: 'Kendi hayalindeki kahramanı yarat', badge: '' },
]

const SETTING_OPTIONS = [
  { id: 'castle', label: 'Bulut Şatosu 🏰', emoji: '🏰', desc: 'Gökyüzünde pamuk bulutlar üstünde', badge: 'Popüler' },
  { id: 'space', label: 'Uzay 🌌', emoji: '🌌', desc: 'Yıldızlar ve gezegenler arasında', badge: 'Yeni' },
  { id: 'forest', label: 'Sihirli Orman 🌳', emoji: '🌳', desc: 'Ağaçların konuştuğu gizemli ağaçlık', badge: '' },
  { id: 'ocean', label: 'Su Altı Şehri 🧜', emoji: '🧜', desc: 'Mercan resifleri ve kayıp saraylar', badge: '' },
  { id: 'candy', label: 'Şeker Köyü 🍬', emoji: '🍬', desc: 'Çikolata nehirli tatlı lezzet diyarı', badge: 'Tavsiye' },
  { id: 'custom', label: 'Kendin Yaz ✍️', emoji: '✍️', desc: 'Masalın geçeceği mekanı sen belirle', badge: '' },
]

const MOOD_OPTIONS = [
  { id: 'magical', label: 'Sihirli ✨', emoji: '✨', desc: 'Gizem ve büyü dolu macera' },
  { id: 'adventure', label: 'Macera 🗺️', emoji: '🗺️', desc: 'Keşif ve heyecan dolu yolculuk' },
  { id: 'funny', label: 'Eğlenceli 🎭', emoji: '🎭', desc: 'Bol kahkahalı komik hikaye' },
  { id: 'educational', label: 'Eğitici 📚', emoji: '📚', desc: 'Önemli dersler veren öğretici' },
  { id: 'calming', label: 'Uyku Öncesi 💤', emoji: '💤', desc: 'Rahatlatan ve gevşeten masal' },
]

const LANG_OPTIONS = [
  { id: 'tr', label: 'Türkçe 🇹🇷', emoji: '🇹🇷', desc: 'Anadilinde akıcı masal' },
  { id: 'en', label: 'English 🇬🇧', emoji: '🇬🇧', desc: 'Learn English with tales' },
]

const RANDOM_HEROES = [
  'Uçan bir kaplumbağa 🐢',
  'Çikolata yemeyi çok seven yavru ejderha 🐉',
  'Yıldızları boyayan minik bir peri 🧚',
  'Uzayda kaybolan ve şarkı söyleyen robot 🤖',
  'Deniz altında yaşayan bilge balina 🐋',
  'Rüzgarla yarışan cesur yavru aslan 🦁',
  'Gözlük takan tatlı bir baykuş 🦉'
]

const RANDOM_SETTINGS = [
  'Bulutların üzerindeki gizemli kütüphane 🏰',
  'Karanlıkta parlayan neon mantar ormanı 🌳',
  'Zaman makinesiyle gidilen antik oyuncak müzesi 🕰️',
  'Çikolata nehirleri akan şeker diyarı 🍬',
  'Uçan balonlarla seyahat edilen gökyüzü şehri 🎈',
  'Balıkların şarkı söylediği mercan sarayı 🧜'
]

const RANDOM_SUBJECTS = [
  'en yakın arkadaşını kurtarmak için yola çıkıyor.',
  'uçmayı unuttuğu için bulutların arasına tırmanmak zorunda kalıyor.',
  'saklambaç oynarken sihirli bir geçit buluyor.',
  'kayıp renkli taşları bulup gökkuşağını kurtarmaya çalışıyor.',
  'rüyaları çalınan çocuklara yardım etmek için düşler ülkesine gidiyor.',
  'kendine yeni bir yuva ararken hiç tanımadığı varlıklarla dost oluyor.'
]

export default function CreatePage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Customizer state
  const [selectedHero, setSelectedHero] = useState('dragon')
  const [customHero, setCustomHero] = useState('')
  const [selectedSetting, setSelectedSetting] = useState('castle')
  const [customSetting, setCustomSetting] = useState('')
  const [selectedMood, setSelectedMood] = useState('magical')
  const [selectedLanguage, setSelectedLanguage] = useState('tr')
  
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const { isLoggedIn, openAuthModal } = useAuth()

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const initialPrompt = searchParams.get('prompt')
    if (initialPrompt) {
      setPrompt(initialPrompt)
    }
  }, [location])

  const handleRandomize = () => {
    const randomHero = RANDOM_HEROES[Math.floor(Math.random() * RANDOM_HEROES.length)]
    const randomSetting = RANDOM_SETTINGS[Math.floor(Math.random() * RANDOM_SETTINGS.length)]
    const randomSubject = RANDOM_SUBJECTS[Math.floor(Math.random() * RANDOM_SUBJECTS.length)]
    const randomMood = MOOD_OPTIONS[Math.floor(Math.random() * (MOOD_OPTIONS.length - 1))].id
    const randomLang = LANG_OPTIONS[Math.floor(Math.random() * LANG_OPTIONS.length)].id

    setSelectedHero('custom')
    setCustomHero(randomHero)
    setSelectedSetting('custom')
    setCustomSetting(randomSetting)
    setSelectedMood(randomMood)
    setSelectedLanguage(randomLang)
    setPrompt(randomSubject)

    showToast('Sihirli bir kombinasyon fısıldandı! 🌟', 'success')
  }

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      showToast('Masal oluşturmak için lütfen giriş yapın veya misafir girişi yapın! 🔑', 'error')
      openAuthModal()
      return
    }

    const heroText = selectedHero === 'custom' ? customHero.trim() : HERO_OPTIONS.find(h => h.id === selectedHero)?.label
    const settingText = selectedSetting === 'custom' ? customSetting.trim() : SETTING_OPTIONS.find(s => s.id === selectedSetting)?.label
    const moodObj = MOOD_OPTIONS.find(m => m.id === selectedMood)
    const moodText = moodObj ? moodObj.label : 'Sihirli'

    let parts = []
    if (heroText) parts.push(`Kahraman: ${heroText}`)
    if (settingText) parts.push(`Mekan: ${settingText}`)
    if (moodText) parts.push(`Tema: ${moodText}`)

    const basePrompt = parts.join(', ')
    const userPrompt = prompt.trim()

    let compiledPrompt = ''
    if (userPrompt) {
      compiledPrompt = `${basePrompt}. Konu: ${userPrompt}`
    } else {
      compiledPrompt = `${basePrompt} hakkında sürükleyici, eğitici ve eğlenceli bir masal.`
    }

    if (compiledPrompt.length < 10) {
      showToast('Lütfen masalınız için en az 10 karakter uzunluğunda bir açıklama yazın veya seçenekleri belirleyin! 🌟', 'error')
      return
    }

    setLoading(true)
    try {
      const story = await storyApi.generate(compiledPrompt, selectedLanguage)
      if (!isLoggedIn) {
        localStorage.setItem('masal-dunyasi:guest-generation-count', '1')
      }
      showToast('Masalın hazır! 🎉', 'success')
      navigate(`/story/${story.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
      showToast(`❌ ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="hero-badge-container">
        <span className="hero-badge" style={{ background: 'rgba(249, 115, 22, 0.08)', color: 'var(--secondary)', borderColor: 'rgba(249, 115, 22, 0.15)' }}>
          <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
          Masal Sihirbazı
        </span>
      </div>
      
      <h1 className="hero-title" style={{ fontSize: '48px', marginBottom: '16px' }}>
        Kendi Masalını Tasarla!
      </h1>
      <p className="hero-sub" style={{ marginBottom: '40px' }}>
        Aşağıdaki seçenekleri kullanarak hayalindeki masalın kahramanını, dünyasını ve konusunu seç. Yapay zeka senin için yazsın!
      </p>

      <button className="magic-random-btn" onClick={handleRandomize} disabled={loading} style={{ background: 'rgba(249, 115, 22, 0.05)', color: 'var(--secondary)' }}>
        <Sparkles size={16} />
        <span>Rastgele Sihir (Şansımı Denemek İstiyorum)</span>
      </button>

      <div className="prompt-box">
        <div className="customizer-container">
          
          <div className="customizer-group">
            <div className="customizer-title">
              <span>🦸 Kahramanını Seç</span>
            </div>
            <div className="option-grid">
              {HERO_OPTIONS.map(h => (
                <div 
                  key={h.id} 
                  className={`option-card ${selectedHero === h.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHero(h.id)}
                >
                  {h.badge && <span className="card-badge">{h.badge}</span>}
                  <div className="option-emoji-wrapper">
                    <span className="option-emoji">{h.emoji}</span>
                  </div>
                  <span className="option-label">{h.label.split(' ')[0]}</span>
                  <span className="option-desc">{h.desc}</span>
                </div>
              ))}
            </div>
            {selectedHero === 'custom' && (
              <div className="custom-input-box">
                <input
                  type="text"
                  className="custom-input"
                  placeholder="Kendi kahramanını yaz (örn: Konuşan bir çilek, haylaz bir bulut)..."
                  value={customHero}
                  onChange={e => setCustomHero(e.target.value)}
                  maxLength={60}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="customizer-group">
            <div className="customizer-title">
              <span>🏰 Masal Nerede Geçsin?</span>
            </div>
            <div className="option-grid">
              {SETTING_OPTIONS.map(s => (
                <div 
                  key={s.id} 
                  className={`option-card ${selectedSetting === s.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSetting(s.id)}
                >
                  {s.badge && <span className="card-badge">{s.badge}</span>}
                  <div className="option-emoji-wrapper">
                    <span className="option-emoji">{s.emoji}</span>
                  </div>
                  <span className="option-label">{s.label.split(' ')[0]}</span>
                  <span className="option-desc">{s.desc}</span>
                </div>
              ))}
            </div>
            {selectedSetting === 'custom' && (
              <div className="custom-input-box">
                <input
                  type="text"
                  className="custom-input"
                  placeholder="Kendi mekanını yaz (örn: Uçan bir korsan gemisi, dev şeker şatosu)..."
                  value={customSetting}
                  onChange={e => setCustomSetting(e.target.value)}
                  maxLength={60}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="customizer-group">
            <div className="customizer-title">
              <span>✨ Masalın Duygusu / Teması</span>
            </div>
            <div className="option-grid">
              {MOOD_OPTIONS.map(m => (
                <div 
                  key={m.id} 
                  className={`option-card ${selectedMood === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMood(m.id)}
                >
                  <div className="option-emoji-wrapper">
                    <span className="option-emoji">{m.emoji}</span>
                  </div>
                  <span className="option-label">{m.label.split(' ')[0]}</span>
                  <span className="option-desc">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="customizer-group">
            <div className="customizer-title">
              <span>🌐 Masalın Dili</span>
            </div>
            <div className="option-grid">
              {LANG_OPTIONS.map(l => (
                <div 
                  key={l.id} 
                  className={`option-card ${selectedLanguage === l.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLanguage(l.id)}
                >
                  <div className="option-emoji-wrapper">
                    <span className="option-emoji">{l.emoji}</span>
                  </div>
                  <span className="option-label">{l.label.split(' ')[0]}</span>
                  <span className="option-desc">{l.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="customizer-title" style={{ marginTop: '24px', marginBottom: '8px' }}>
          <span>✍️ Eklemek İstediğin Özel Macera Detayı (Opsiyonel)</span>
        </div>
        <div className="prompt-input-wrapper">
          <textarea
            className="prompt-input"
            placeholder="Örnek: Kahramanımız orada sihirli bir ayna bulur ve aynanın içine girerek yeni arkadaşıyla karşılaşır..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            maxLength={500}
            disabled={loading}
          />
        </div>

        <button
          className="cta-btn"
          onClick={handleGenerate}
          disabled={loading}
          style={{ marginTop: '30px' }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              <span>Masal Yazılıyor, Sihir Devrede...</span>
            </>
          ) : (
            <>
              <Wand2 size={20} />
              <span>Sihirli Masalımı Oluştur</span>
            </>
          )}
        </button>
      </div>
    </>
  )
}
