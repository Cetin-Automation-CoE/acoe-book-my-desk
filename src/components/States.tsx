import { useT } from '../hooks/useLang'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'

// Skeleton blocks shown in the panel while the first data loads.
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-3.5" aria-busy="true">
      <div className="h-[150px] rounded-3xl bg-[#e9ebf2]" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="h-[184px] rounded-[22px] bg-[#eceef4]" />
      ))}
    </div>
  )
}

// Offline / failed request: the message and a retry button.
export function ErrorCard({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-white p-5 shadow-card" role="alert">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/12 text-lg font-extrabold text-accent">
          !
        </span>
        <p className="text-base font-semibold leading-[23px] text-ink">{errorMessage(error)}</p>
      </div>
      <Button variant="secondary" className="min-h-[52px] text-base" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  )
}
