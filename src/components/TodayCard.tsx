import { useT } from '../hooks/useLang'
import { formatDayLong } from '../lib/dates'
import type { CardVariant } from '../lib/smart'
import type { Seat, SlotChoice } from '../lib/types'
import { Button } from './Button'

interface TodayCardProps {
  variant: CardVariant
  seats: Seat[]
  selected: string
  today: string
  busy: boolean
  onManage: () => void
  onQuickBook: (seatId: string, slot: SlotChoice) => void
}

const codeOf = (seats: Seat[], id: string) => seats.find((s) => s.id === id)?.code ?? ''

// The card above the seat grid: my booking for the day, or a one-tap suggestion.
export function TodayCard({ variant, seats, selected, today, busy, onManage, onQuickBook }: TodayCardProps) {
  const t = useT()

  if (variant.kind === 'booked') {
    const codes = [...new Set(variant.bookings.map((b) => codeOf(seats, b.seat_id)))]
    return (
      <section className="mb-[22px] flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-card-raised">
        <div className="bg-mine flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
          <span className="text-[12.5px] font-extrabold tracking-[-0.01em] tabular-nums">{codes[0]}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-xs font-bold uppercase leading-4 tracking-[0.04em] text-muted">{t.card.booked}</span>
          <span className="truncate text-[17px] font-extrabold leading-[22px] tabular-nums text-ink">{codes.join(' · ')}</span>
          <span className="truncate text-[13.5px] leading-[18px] text-muted">
            {t.slots[variant.slotLabel]} · {formatDayLong(selected, today)}
          </span>
        </div>
        <Button variant="secondary" className="min-h-11 rounded-[14px] px-[18px] text-[15px] font-extrabold" onClick={onManage}>
          {t.card.manage}
        </Button>
      </section>
    )
  }

  const code = codeOf(seats, variant.seatId)
  const isAlt = variant.kind === 'alternative'
  const eyebrow = isAlt ? t.card.isTaken(codeOf(seats, variant.usualId)) : t.card.usual
  const sub = isAlt
    ? variant.nearness === 'pair'
      ? t.card.nextTo
      : variant.nearness === 'table'
        ? t.card.sameTable
        : t.card.closest
    : formatDayLong(selected, today)
  return (
    <section className="mb-[22px] flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-card-raised">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand/6 text-brand shadow-[inset_0_0_0_1.5px_rgba(48,0,145,.14)]">
        <span className="text-[12.5px] font-extrabold tracking-[-0.01em] tabular-nums">{code}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase leading-4 tracking-[0.04em] ${isAlt ? 'text-accent' : 'text-muted'}`}>
          {isAlt && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          {eyebrow}
        </span>
        <span className="truncate text-[17px] font-extrabold leading-[22px] tabular-nums text-ink">{code}</span>
        <span className="truncate text-[13.5px] leading-[18px] text-muted">
          {t.slots[variant.slot]} · {sub}
        </span>
      </div>
      <Button
        className="min-h-11 rounded-[14px] px-[18px] text-[15px] font-extrabold"
        onClick={() => onQuickBook(variant.seatId, variant.slot)}
        disabled={busy}
      >
        {busy ? t.seats.booking : t.seats.book}
      </Button>
    </section>
  )
}
