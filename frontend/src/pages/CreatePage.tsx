import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { storyApi } from '../services/api'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Shuffle, PenLine } from 'lucide-react'

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

  const optionName = (o: { label: string; emoji: string }) => o.label.replace(o.emoji, '').trim()
  const heroSummary = selectedHero === 'custom' ? (customHero.trim() || 'Kendi kahramanın') : optionName(HERO_OPTIONS.find(h => h.id === selectedHero)!)
  const settingSummary = selectedSetting === 'custom' ? (customSetting.trim() || 'Kendi mekânın') : optionName(SETTING_OPTIONS.find(s => s.id === selectedSetting)!)
  const moodSummary = optionName(MOOD_OPTIONS.find(m => m.id === selectedMood)!)
  const langSummary = optionName(LANG_OPTIONS.find(l => l.id === selectedLanguage)!)

  return (
    <div className="create-page">
      <div className="create-header">
        <div className="create-header-text">
          <p className="create-eyebrow">Sihirli masal odası</p>
          <h1 className="create-title">Bu geceki masalı birlikte kuralım</h1>
          <p className="create-sub">Birkaç seçim yap, gerisini yapay zekaya bırak. Her adımda "Kendin Yaz" ile tamamen özgür olabilirsin.</p>
        </div>
        <button type="button" className="create-random-btn" onClick={handleRandomize} disabled={loading}>
          <Shuffle size={20} />
          <span>Rastgele Sihir</span>
        </button>
      </div>

      <div className="create-layout">
        <div className="create-form">

          <fieldset className="create-step">
            <legend className="create-step-title"><span className="create-step-num">1</span>Kahramanını seç</legend>
            <div className="create-option-grid">
              {HERO_OPTIONS.map(h => (
                <button
                  type="button"
                  key={h.id}
                  aria-pressed={selectedHero === h.id}
                  className={`create-option ${h.id === 'custom' ? 'is-custom' : ''} ${selectedHero === h.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHero(h.id)}
                  disabled={loading}
                >
                  <span className="create-option-head">
                    <span className="create-option-name">
                      {h.id === 'custom' && <PenLine size={18} />}
                      {optionName(h)}
                    </span>
                    {h.badge && <span className="create-option-badge">{h.badge}</span>}
                  </span>
                  <span className="create-option-desc">{h.desc}</span>
                </button>
              ))}
            </div>
            {selectedHero === 'custom' && (
              <input
                type="text"
                className="create-custom-input"
                aria-label="Kendi kahramanın"
                placeholder="Kendi kahramanını yaz (örn: Konuşan bir çilek, haylaz bir bulut)..."
                value={customHero}
                onChange={e => setCustomHero(e.target.value)}
                maxLength={60}
                disabled={loading}
              />
            )}
          </fieldset>

          <fieldset className="create-step">
            <legend className="create-step-title"><span className="create-step-num">2</span>Masal nerede geçsin?</legend>
            <div className="create-option-grid">
              {SETTING_OPTIONS.map(s => (
                <button
                  type="button"
                  key={s.id}
                  aria-pressed={selectedSetting === s.id}
                  className={`create-option ${s.id === 'custom' ? 'is-custom' : ''} ${selectedSetting === s.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSetting(s.id)}
                  disabled={loading}
                >
                  <span className="create-option-head">
                    <span className="create-option-name">
                      {s.id === 'custom' && <PenLine size={18} />}
                      {optionName(s)}
                    </span>
                    {s.badge && <span className="create-option-badge">{s.badge}</span>}
                  </span>
                  <span className="create-option-desc">{s.desc}</span>
                </button>
              ))}
            </div>
            {selectedSetting === 'custom' && (
              <input
                type="text"
                className="create-custom-input"
                aria-label="Kendi mekânın"
                placeholder="Kendi mekanını yaz (örn: Uçan bir korsan gemisi, dev şeker şatosu)..."
                value={customSetting}
                onChange={e => setCustomSetting(e.target.value)}
                maxLength={60}
                disabled={loading}
              />
            )}
          </fieldset>

          <fieldset className="create-step">
            <legend className="create-step-title"><span className="create-step-num">3</span>Masalın havası</legend>
            <div className="create-pills">
              {MOOD_OPTIONS.map(m => (
                <button
                  type="button"
                  key={m.id}
                  title={m.desc}
                  aria-pressed={selectedMood === m.id}
                  className={`create-pill ${selectedMood === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMood(m.id)}
                  disabled={loading}
                >
                  {optionName(m)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="create-step">
            <legend className="create-step-title"><span className="create-step-num">4</span>Masalın dili</legend>
            <div className="create-segmented">
              {LANG_OPTIONS.map(l => (
                <button
                  type="button"
                  key={l.id}
                  aria-pressed={selectedLanguage === l.id}
                  className={selectedLanguage === l.id ? 'selected' : ''}
                  onClick={() => setSelectedLanguage(l.id)}
                  disabled={loading}
                >
                  {optionName(l)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="create-step">
            <label htmlFor="create-detail" className="create-step-title">
              <span className="create-step-num">5</span>Özel bir detay ekle <span className="create-optional">(isteğe bağlı)</span>
            </label>
            <textarea
              id="create-detail"
              className="create-textarea"
              rows={4}
              placeholder="Örn. Kahramanımız sihirli bir ayna bulur ve aynanın içinde yeni bir arkadaşla karşılaşır…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              maxLength={500}
              disabled={loading}
            />
          </div>
        </div>

        <aside className="create-summary" aria-label="Masal özeti">
          <h2 className="create-summary-title">Bu geceki masal</h2>
          <dl className="create-summary-list">
            <div><dt>Kahraman</dt><dd>{heroSummary}</dd></div>
            <div><dt>Mekân</dt><dd>{settingSummary}</dd></div>
            <div><dt>Hava</dt><dd>{moodSummary}</dd></div>
            <div><dt>Dil</dt><dd>{langSummary}</dd></div>
          </dl>
          <button
            type="button"
            className="cta-btn create-submit"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Masal yazılıyor…</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Masalımı Oluştur</span>
              </>
            )}
          </button>
          <p className="create-summary-note">Masal yaklaşık bir dakikada hazır olur; kapak resmi ve seslendirme ardından eklenir.</p>
        </aside>
      </div>
    </div>
  )
}
