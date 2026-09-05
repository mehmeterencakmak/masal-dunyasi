import React, { useRef, useState, useEffect } from 'react'
import { Undo, Redo, Eraser, Trash2, Download, Paintbrush, X, PaintBucket } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { artworkApi } from '../../services/api'

interface ColoringCanvasProps {
  storyId: string
  outlineUrl: string
  storyTitle: string
  onClose: () => void
}

const MAGIC_COLORS = [
  { name: 'Gül Kurusu', hex: '#ec4899' },
  { name: 'Sihirli Mor', hex: '#a855f7' },
  { name: 'Galaksi Moru', hex: '#7c3aed' },
  { name: 'Okyanus Mavisi', hex: '#3b82f6' },
  { name: 'Çimen Yeşili', hex: '#10b981' },
  { name: 'Limon Sarısı', hex: '#fbbf24' },
  { name: 'Turuncu Alev', hex: '#f97316' },
  { name: 'Mercan Kırmızısı', hex: '#ef4444' },
  { name: 'Çikolata', hex: '#78350f' },
  { name: 'Gece Siyahı', hex: '#1e293b' },
]

export default function ColoringCanvas({ storyId, outlineUrl, storyTitle, onClose }: ColoringCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const outlineImageRef = useRef<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#a855f7')
  const [brushSize, setBrushSize] = useState(8)
  const [tool, setTool] = useState<'brush' | 'bucket' | 'eraser'>('bucket')
  const { showToast } = useToast()

  // Sihirli Galeri Paylaşım Onay State'leri
  const [showShareConfirm, setShowShareConfirm] = useState(false)
  const [tempDataUrl, setTempDataUrl] = useState('')
  const [sharing, setSharing] = useState(false)

  // Undo/Redo geçmişi
  const [history, setHistory] = useState<string[]>([])
  const [historyStep, setHistoryStep] = useState(-1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Retina ekranlar ve net çizim için boyut ayarı
    const width = 600
    const height = 600
    canvas.width = width
    canvas.height = height
    canvas.style.width = '100%'
    canvas.style.height = '100%'

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = color
    context.lineWidth = brushSize
    contextRef.current = context

    // Outline resmini önyükle ve kanvasa çiz
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = outlineUrl
    img.onload = () => {
      outlineImageRef.current = img
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(img, 0, 0, width, height)

      // Kanvasın ilk halini geçmişe kaydet
      const initialState = canvas.toDataURL()
      setHistory([initialState])
      setHistoryStep(0)
    }
  }, [])

  // Renk veya boyut değiştiğinde context'i güncelle
  useEffect(() => {
    if (!contextRef.current) return
    contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    contextRef.current.lineWidth = brushSize
  }, [color, brushSize, tool])

  const redrawOutline = () => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    const img = outlineImageRef.current
    if (!canvas || !ctx || !img) return

    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const handleFloodFill = (startX: number, startY: number) => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    const width = canvas.width
    const height = canvas.height

    const hex = color
    const r_fill = parseInt(hex.slice(1, 3), 16)
    const g_fill = parseInt(hex.slice(3, 5), 16)
    const b_fill = parseInt(hex.slice(5, 7), 16)
    const a_fill = 255

    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    const startXInt = Math.floor(startX)
    const startYInt = Math.floor(startY)

    if (startXInt < 0 || startXInt >= width || startYInt < 0 || startYInt >= height) return

    const targetIndex = (startYInt * width + startXInt) * 4
    const targetR = data[targetIndex]
    const targetG = data[targetIndex + 1]
    const targetB = data[targetIndex + 2]
    const targetA = data[targetIndex + 3]

    // Aynı renk ise doldurma
    if (targetR === r_fill && targetG === g_fill && targetB === b_fill && targetA === a_fill) {
      return
    }

    // Çok koyu çizgilere tıklanırsa işlem yapma
    const startBrightness = (targetR * 299 + targetG * 587 + targetB * 114) / 1000
    if (startBrightness < 120) {
      return
    }

    const queueX = new Int32Array(width * height)
    const queueY = new Int32Array(width * height)
    let head = 0
    let tail = 0

    queueX[tail] = startXInt
    queueY[tail] = startYInt
    tail++

    const visited = new Uint8Array(width * height)
    visited[startYInt * width + startXInt] = 1

    const tolerance = 60
    const matchColor = (r: number, g: number, b: number, a: number) => {
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      if (brightness < 120) return false

      return Math.abs(r - targetR) <= tolerance &&
             Math.abs(g - targetG) <= tolerance &&
             Math.abs(b - targetB) <= tolerance &&
             Math.abs(a - targetA) <= tolerance
    }

    while (head < tail) {
      const x = queueX[head]
      const y = queueY[head]
      head++

      const idx = y * width + x
      const pixelStartIdx = idx * 4

      data[pixelStartIdx] = r_fill
      data[pixelStartIdx + 1] = g_fill
      data[pixelStartIdx + 2] = b_fill
      data[pixelStartIdx + 3] = a_fill

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      ]

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx
          if (!visited[nIdx]) {
            const npStartIdx = nIdx * 4
            const nr = data[npStartIdx]
            const ng = data[npStartIdx + 1]
            const nb = data[npStartIdx + 2]
            const na = data[npStartIdx + 3]

            if (matchColor(nr, ng, nb, na)) {
              visited[nIdx] = 1
              queueX[tail] = nx
              queueY[tail] = ny
              tail++
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0)
    redrawOutline()
    saveHistory()
  }

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    if (!contextRef.current) return

    if (tool === 'bucket') {
      handleFloodFill(x, y)
      return
    }

    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || tool === 'bucket') return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    contextRef.current.lineTo(x, y)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (contextRef.current) {
      contextRef.current.closePath()
    }
    redrawOutline()
    saveHistory()
  }

  // Geçmiş adımı kaydetme
  const saveHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const currentState = canvas.toDataURL()
    
    // Eğer geçmiş adımındayken yeni bir şey çizilirse, o adımdan sonrasını sil
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(currentState)
    
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyStep <= 0) return
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    const newStep = historyStep - 1
    const img = new Image()
    img.src = history[newStep]
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      setHistoryStep(newStep)
    }
  }

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return

    const newStep = historyStep + 1
    const img = new Image()
    img.src = history[newStep]
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      setHistoryStep(newStep)
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    const img = outlineImageRef.current
    if (!canvas || !ctx || !img) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    saveHistory()
    showToast('Tüm boyamalar temizlendi! 🧹', 'info')
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    redrawOutline()
    const dataUrl = canvas.toDataURL('image/png')
    setTempDataUrl(dataUrl)
    setShowShareConfirm(true)
  }

  const confirmShare = async (share: boolean) => {
    if (share) {
      setSharing(true)
      try {
        await artworkApi.create(storyId, tempDataUrl)
        showToast('Eseriniz Sihirli Galeri\'de paylaşıldı! 🎨💖', 'success')
      } catch (err: any) {
        showToast(err.message || 'Galeriye kaydedilirken hata oluştu.', 'error')
      } finally {
        setSharing(false)
      }
    }

    showToast('Şaheserin indiriliyor... 🎨💖', 'success')
    const link = document.createElement('a')
    link.download = `${storyTitle.replace(/\s+/g, '_')}_boyama.png`
    link.href = tempDataUrl
    link.click()
    setShowShareConfirm(false)
  }

  return (
    <div className="auth-modal-backdrop" style={{ zIndex: 1000, padding: '20px' }}>
      <div className="auth-modal-card" style={{ maxWidth: '820px', width: '100%', padding: '24px', background: 'var(--bg-card)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Sihirli Boyama Sayfası</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>"{storyTitle}" hikayesinden bir sahneyi renklendiriyorsun</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Canvas & Palette Layout */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Left: Canvas Area */}
          <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: '#ffffff', overflow: 'hidden', width: '450px', height: '450px' }}>
            {/* Drawing Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair', touchAction: 'none' }}
            />
          </div>

          {/* Right: Controls & Colors */}
          <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Paint/Bucket/Eraser toggle */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setTool('brush')} 
                className={`speed-btn ${tool === 'brush' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Paintbrush size={16} />
                Fırça
              </button>
              <button 
                onClick={() => setTool('bucket')} 
                className={`speed-btn ${tool === 'bucket' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
              >
                <PaintBucket size={16} />
                Kova
              </button>
              <button 
                onClick={() => setTool('eraser')} 
                className={`speed-btn ${tool === 'eraser' ? 'active' : ''}`}
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Eraser size={16} />
                Silgi
              </button>
            </div>

            {/* Brush Size Slider (Only relevant for Brush and Eraser) */}
            {tool !== 'bucket' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                  <span>Boyut</span>
                  <span>{brushSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="40" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </div>
            )}

            {/* Color Palette */}
            <div>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Sihirli Renkler</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {MAGIC_COLORS.map(col => (
                  <button
                    key={col.hex}
                    onClick={() => { setColor(col.hex); if (tool === 'eraser') setTool('brush'); }}
                    style={{
                      background: col.hex,
                      height: '36px',
                      borderRadius: '50%',
                      border: color === col.hex && tool !== 'eraser' ? '3px solid #000' : '1px solid rgba(0,0,0,0.1)',
                      boxShadow: color === col.hex && tool !== 'eraser' ? '0 0 10px rgba(0,0,0,0.25)' : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
                    }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* History Actions */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto' }}>
              <button 
                onClick={handleUndo} 
                disabled={historyStep <= 0} 
                className="tool-btn" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="Geri Al"
              >
                <Undo size={14} />
                Geri
              </button>
              <button 
                onClick={handleRedo} 
                disabled={historyStep >= history.length - 1} 
                className="tool-btn" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="İleri Al"
              >
                <Redo size={14} />
                İleri
              </button>
              <button 
                onClick={handleClear} 
                className="tool-btn" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                title="Kanvası Temizle"
              >
                <Trash2 size={14} />
                Temizle
              </button>
            </div>

            {/* Save/Download Action */}
            <button
              onClick={handleDownload}
              style={{
                width: '100%',
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Download size={16} />
              Şaheseri Kaydet & İndir
            </button>

          </div>
        </div>

      </div>
      {showShareConfirm && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(10, 6, 30, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1010,
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{
            maxWidth: '380px',
            width: '90%',
            padding: '24px',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨✨</div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
              Sihirli Galeri'de Paylaş!
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '20px' }}>
              Bu güzel resmi Sihirli Galeri'de paylaşarak diğer masal diyarı sakinleriyle sergilemek ister misin?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => confirmShare(true)}
                disabled={sharing}
                id="btn-confirm-share-yes"
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {sharing ? 'Kaydediliyor...' : 'Evet, Galeriye Gönder! 💖'}
              </button>
              <button
                onClick={() => confirmShare(false)}
                disabled={sharing}
                id="btn-confirm-share-no"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Hayır, Sadece İndir 📥
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
