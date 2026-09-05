// ─── TOAST — Global bildirim sistemi ──────────────────
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Sparkles, XCircle, Info, CheckCircle2 } from 'lucide-react'

interface Toast {
  id: number
  message: string
  type?: 'info' | 'success' | 'error'
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const getToastStyleAndIcon = (toast: Toast) => {
    const isErrorText = toast.message.includes('❌') || toast.message.includes('Hata') || toast.message.includes('başarısız')
    const isSuccessText = toast.message.includes('✓') || toast.message.includes('hazır') || toast.message.includes('Hazır') || toast.message.includes('başarıyla') || toast.message.includes('🎉')
    
    let resolvedType = toast.type
    if (resolvedType === 'info') {
      if (isErrorText) resolvedType = 'error'
      else if (isSuccessText) resolvedType = 'success'
    }

    // Temiz mesaj (emoji'leri kaldırıp daha şık gösterebiliriz, ama kullanıcı emojilerini koruyalım)
    const displayMessage = toast.message;

    switch (resolvedType) {
      case 'error':
        return {
          style: { borderColor: 'var(--danger)', boxShadow: '0 8px 30px rgba(239, 68, 68, 0.25)' },
          icon: <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        }
      case 'success':
        return {
          style: { borderColor: 'var(--success)', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25)' },
          icon: <Sparkles size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
        }
      default:
        return {
          style: { borderColor: 'var(--primary)', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.25)' },
          icon: <Info size={18} style={{ color: 'var(--primary-hover)', flexShrink: 0 }} />
        }
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const { style, icon } = getToastStyleAndIcon(t)
          return (
            <div key={t.id} className="toast" style={style}>
              {icon}
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast ToastProvider içinde kullanılmalı')
  return ctx
}
