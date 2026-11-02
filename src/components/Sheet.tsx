import { useEffect, type ReactNode } from 'react'
import { strings } from '../strings'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-brand-deep/40" aria-label={strings.close} onClick={onClose} />
      <div className="sheet-panel relative w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(48,0,145,0.15)]">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">{title}</h2>
        {children}
      </div>
    </div>
  )
}
