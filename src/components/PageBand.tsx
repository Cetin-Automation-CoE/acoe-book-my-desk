import type { ReactNode } from 'react'
import { useT } from '../hooks/useLang'
import { useShell } from './AppShell'

interface PageBandProps {
  title: string
  sub?: string
  // Large figure on the right (free seats, week streak) with a small label under it.
  figure?: { value: string | number; label: string }
  children?: ReactNode
}

// The CETIN Blue header of every tab: avatar row, large title, optional figure, then whatever the
// page puts on the band (day strip, slot toggle). The content panel overlaps its bottom by 24px.
// Band and panel run edge to edge; only their content is kept to phone width.
export function PageBand({ title, sub, figure, children }: PageBandProps) {
  const t = useT()
  const { openProfile, initials, avatar } = useShell()
  return (
    <header className="band px-4 pb-11 pt-[calc(env(safe-area-inset-top)+0.875rem)]">
      <div className="mx-auto w-full max-w-md">
      <div className="flex h-11 items-center justify-end">
        <button
          type="button"
          onClick={openProfile}
          aria-label={t.profile.title}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white/28 bg-white/12 text-sm font-extrabold tracking-[0.02em] text-white transition active:scale-[0.94]"
        >
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
        </button>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[34px] font-extrabold leading-10 tracking-[-0.025em] text-white">{title}</h1>
          {sub && <p className="mt-0.5 text-[15px] leading-5 text-white/72">{sub}</p>}
        </div>
        {figure && (
          <div className="shrink-0 text-right">
            <div className="text-[34px] font-extrabold leading-10 tracking-[-0.02em] tabular-nums text-white">{figure.value}</div>
            <div className="mt-0.5 text-[12.5px] leading-5 text-white/72">{figure.label}</div>
          </div>
        )}
      </div>
      {children}
      </div>
    </header>
  )
}

// The scrolling content panel under the band.
export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mt-6 min-h-[480px] rounded-t-[28px] bg-surface px-4 pb-[124px] pt-5">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}
