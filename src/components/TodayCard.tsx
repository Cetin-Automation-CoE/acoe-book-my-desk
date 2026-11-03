import { useT } from '../hooks/useLang'
import { formatDayLong } from '../lib/dates'
import type { CardVariant } from '../lib/smart'
import type { LunchChoice, Seat } from '../lib/types'
import { Button } from './Button'
import { LunchPicker } from './LunchPicker'

interface TodayCardProps {
  variant: CardVariant
  seats: Seat[]
  selected: string
  today: string
  busy: boolean
  onManage: () => void
  onQuickBook: (seatId: string) => void
  // My lunch plan for the day, shown under a booking.
  lunch: { value: LunchChoice | null; busy: boolean; onChange: (next: LunchChoice | null) => void }
}

const codeOf = (seats: Seat[], id: string) => seats.find((s) => s.id === id)?.code ?? ''

// The card above the seat grid: my booking for the day, or a one-tap suggestion.
export function TodayCard({ variant, seats, selected, today, busy, onManage, onQuickBook, lunch }: TodayCardProps) {
  const t = useT()

  if (variant.kind === 'booked') {
    const codes = [...new Set(variant.bookings.map((b) => codeOf(seats, b.seat_id)))]
    return (
      <section className="mb-[22px] rounded-3xl bg-white p-3.5 shadow-card-raised">
        <div className="flex items-center gap-3">
          <div className="bg-mine flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white shadow-brand">
            <span className="text-[11px] font-extrabold tracking-[-0.01em] tabular-nums">{codes[0]}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.02em] text-muted">{t.card.booked}</span>
            <span className="truncate text-base font-extrabold leading-[22px] tabular-nums text-ink">{codes.join(' · ')}</span>
            <span className="text-[13.5px] leading-[18px] text-muted">{formatDayLong(selected, today)}</span>
          </div>
          <Button variant="secondary" className="min-h-11 rounded-[14px] px-3 text-[14px] font-extrabold" onClick={onManage}>
            {t.card.manage}
          </Button>
        </div>
        <div className="mt-3 border-t border-rule pt-3">
          <LunchPicker label={t.lunch.label} value={lunch.value} busy={lunch.busy} onChange={lunch.onChange} />
        </div>
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
    <section className="mb-[22px] flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-card-raised">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-brand/6 text-brand shadow-[inset_0_0_0_1.5px_rgba(48,0,145,.14)]">
        <span className="text-[11px] font-extrabold tracking-[-0.01em] tabular-nums">{code}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`flex min-w-0 items-start gap-1.5 text-[11px] font-bold uppercase leading-4 tracking-[0.02em] ${isAlt ? 'text-accent' : 'text-muted'}`}>
          {isAlt && <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          <span>{eyebrow}</span>
        </span>
        <span className="truncate text-base font-extrabold leading-[22px] tabular-nums text-ink">{code}</span>
        <span className="text-[13.5px] leading-[18px] text-muted">{sub}</span>
      </div>
      <Button
        className="min-h-11 rounded-[14px] px-3 text-[14px] font-extrabold"
        onClick={() => onQuickBook(variant.seatId)}
        disabled={busy}
      >
        {busy ? t.seats.booking : t.seats.book}
      </Button>
    </section>
  )
}
