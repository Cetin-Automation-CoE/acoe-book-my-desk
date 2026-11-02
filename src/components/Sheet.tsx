import { useEffect, type ReactNode } from 'react'
import { useT } from '../hooks/useLang'

interface SheetProps {
  open: boolean
  // Accessible name; shown as a heading only when `heading` is true.
  title: string
  heading?: boolean
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, heading = false, onClose, children }: SheetProps) {
  const t = useT()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-overlay absolute inset-0 bg-brand-deep/45" aria-label={t.close} onClick={onClose} />
      <div className="sheet-panel relative max-h-[calc(100dvh-2.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-white px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-2 shadow-sheet [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div aria-hidden className="mx-auto mb-4 h-[5px] w-[38px] rounded-full bg-line" />
        {heading && <h2 className="mb-2 text-[21px] font-extrabold leading-[26px] text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
