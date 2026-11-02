import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Tone = 'info' | 'error'
interface Toast {
  message: string
  tone: Tone
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((message: string, tone: Tone = 'info') => {
    window.clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 4000 : 2500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.tone === 'error' ? 'bg-accent' : 'bg-brand'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
