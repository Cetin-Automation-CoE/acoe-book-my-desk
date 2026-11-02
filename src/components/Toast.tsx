import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Tone = 'info' | 'error'
interface Toast {
  message: string
  tone: Tone
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {})

// Info toasts queue up so "Checked in" and a badge earned right after it are both seen;
// an error jumps the queue and drops whatever was waiting.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const queue = useRef<Toast[]>([])
  const showing = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const next = useCallback(function advance() {
    const item = queue.current.shift()
    if (!item) {
      showing.current = false
      setToast(null)
      return
    }
    showing.current = true
    setToast(item)
    timer.current = window.setTimeout(advance, item.tone === 'error' ? 4000 : 2500)
  }, [])

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      if (tone === 'error') {
        window.clearTimeout(timer.current)
        queue.current = [{ message, tone }]
        next()
        return
      }
      queue.current.push({ message, tone })
      if (!showing.current) next()
    },
    [next],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

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
