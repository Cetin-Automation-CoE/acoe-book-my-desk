import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../hooks/useLang'
import { CheckIcon } from './icons'

type Tone = 'info' | 'error'
interface Toast {
  message: string
  tone: Tone
  undo?: () => void
}
export type ShowToast = (message: string, tone?: Tone, options?: { undo?: () => void }) => void

const ToastContext = createContext<ShowToast>(() => {})

// Info toasts queue up so "Booked." and a badge earned right after it are both seen;
// an error jumps the queue and drops whatever was waiting.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const queue = useRef<Toast[]>([])
  const showing = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const t = useT()

  const next = useCallback(function advance() {
    const item = queue.current.shift()
    if (!item) {
      showing.current = false
      setToast(null)
      return
    }
    showing.current = true
    setToast(item)
    timer.current = window.setTimeout(advance, item.tone === 'error' ? 4000 : item.undo ? 4500 : 2500)
  }, [])

  const show = useCallback<ShowToast>(
    (message, tone = 'info', options) => {
      const item: Toast = { message, tone, undo: options?.undo }
      if (tone === 'error') {
        window.clearTimeout(timer.current)
        queue.current = [item]
        next()
        return
      }
      queue.current.push(item)
      if (!showing.current) next()
    },
    [next],
  )

  const undo = () => {
    toast?.undo?.()
    window.clearTimeout(timer.current)
    next()
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className={`toast-panel fixed inset-x-3.5 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-[18px] py-2.5 pl-3 pr-2.5 text-sm font-bold text-white shadow-toast ${
            toast.tone === 'error' ? 'bg-accent' : 'bg-brand-deep'
          }`}
        >
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-white/16 text-sm font-extrabold">
            {toast.tone === 'error' ? '!' : <CheckIcon width={15} height={15} className="text-sky" strokeWidth={2.5} />}
          </span>
          <span className="min-h-[19px] flex-1">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={undo}
              className="min-h-[34px] shrink-0 rounded-xl bg-white/16 px-3 text-sm font-extrabold text-white"
            >
              {t.undo}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
