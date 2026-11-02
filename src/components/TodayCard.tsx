import { useT } from '../hooks/useLang'
import { clockIn, formatDayLong, formatTime } from '../lib/dates'
import { splitCode } from '../lib/people'
import type { CardVariant } from '../lib/smart'
import type { Seat, SlotChoice } from '../lib/types'
import { Button } from './Button'
import { CheckIcon } from './icons'

interface TodayCardProps {
  variant: CardVariant
  seats: Seat[]
  selected: string
  today: string
  tz: string
  busy: boolean
  onCheckInAll: () => void
  onManage: () => void
  onQuickBook: (seatId: string, slot: SlotChoice) => void
}

const codeOf = (seats: Seat[], id: string) => seats.find((s) => s.id === id)?.code ?? ''

// The card above the seat grid: today's check-in, a future booking, or a one-tap suggestion.
export function TodayCard({ variant, seats, selected, today, tz, busy, onCheckInAll, onManage, onQuickBook }: TodayCardProps) {
  const t = useT()

  if (variant.kind === 'ring') {
    const seatCodes = [...new Set(variant.bookings.map((b) => codeOf(seats, b.seat_id)))].join(' · ')
    const ringColor = variant.state === 'open' ? '#41b6e6' : variant.state === 'done' ? '#41b6e6' : variant.state === 'exempt' ? '#6f79bd' : '#f12e49'
    const h = Math.floor(variant.minutesLeft / 60)
    const m = variant.minutesLeft % 60
    const sub =
      variant.state === 'open'
        ? t.myBookings.checkInBy(formatTime(variant.deadline))
        : variant.state === 'done'
          ? t.card.checkedInAt(variant.checkedInAt ? clockIn(tz, new Date(variant.checkedInAt)) : '')
          : variant.state === 'exempt'
            ? t.myBookings.ownerNoCheckIn
            : t.myBookings.checkInMissed
    const subColor = variant.state === 'done' ? 'text-brand' : variant.state === 'missed' ? 'text-accent' : 'text-muted'
    return (
      <section className="mb-[22px] flex flex-col gap-3.5 rounded-3xl bg-white p-4 shadow-card-raised">
        <div className="flex items-center gap-3.5">
          <div
            aria-hidden
            className="relative h-[66px] w-[66px] shrink-0 rounded-full"
            style={{ background: `conic-gradient(${ringColor} ${variant.pct}%, rgba(48,0,145,.08) 0)` }}
          >
            <div className="absolute inset-1.5 flex flex-col items-center justify-center rounded-full bg-white text-brand">
              {variant.state === 'open' || variant.state === 'missed' ? (
                <>
                  <span className="text-base font-extrabold leading-[18px] tabular-nums">
                    {h}:{String(m).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-bold uppercase leading-3 tracking-[0.06em] text-muted">{t.card.left}</span>
                </>
              ) : (
                <CheckIcon width={26} height={26} style={{ color: ringColor }} strokeWidth={2.5} />
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[12.5px] font-bold uppercase leading-4 tracking-[0.04em] text-muted">
              {t.days.today} · {t.slots[variant.slotLabel]}
            </span>
            <span className="text-[19px] font-extrabold leading-6 tracking-[-0.01em] text-ink">{t.card.youreAt(seatCodes)}</span>
            <span className={`text-sm leading-[19px] ${subColor}`}>{sub}</span>
          </div>
        </div>
        {variant.state === 'open' && (
          <Button className="min-h-[54px] font-extrabold" onClick={onCheckInAll} disabled={busy}>
            {busy ? t.myBookings.checkingIn : t.myBookings.checkIn}
          </Button>
        )}
      </section>
    )
  }

  if (variant.kind === 'booked') {
    const first = codeOf(seats, variant.bookings[0].seat_id)
    const { prefix, digits } = splitCode(first)
    return (
      <section className="mb-[22px] flex items-center gap-3.5 rounded-3xl bg-white p-3.5 shadow-card-raised">
        <div className="bg-mine flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-brand">
          <span className="text-[9.5px] font-bold leading-[11px] tracking-[0.05em] opacity-70">{prefix}</span>
          <span className="text-[23px] font-extrabold leading-[25px] tracking-[-0.02em] tabular-nums">{digits}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-xs font-bold uppercase leading-4 tracking-[0.04em] text-muted">{t.card.booked}</span>
          <span className="truncate text-[17px] font-extrabold leading-[22px] text-ink">
            {first} · {t.slots[variant.slotLabel]}
          </span>
          <span className="truncate text-[13.5px] leading-[18px] text-muted">{formatDayLong(selected, today)}</span>
        </div>
        <Button variant="secondary" className="min-h-11 rounded-[14px] px-[18px] text-[15px] font-extrabold" onClick={onManage}>
          {t.card.manage}
        </Button>
      </section>
    )
  }

  const code = codeOf(seats, variant.seatId)
  const { prefix, digits } = splitCode(code)
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
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand/6 text-brand shadow-[inset_0_0_0_1.5px_rgba(48,0,145,.14)]">
        <span className="text-[9.5px] font-bold leading-[11px] tracking-[0.05em] opacity-70">{prefix}</span>
        <span className="text-[23px] font-extrabold leading-[25px] tracking-[-0.02em] tabular-nums">{digits}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase leading-4 tracking-[0.04em] ${isAlt ? 'text-accent' : 'text-muted'}`}>
          {isAlt && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          {eyebrow}
        </span>
        <span className="truncate text-[17px] font-extrabold leading-[22px] text-ink">
          {code} · {t.slots[variant.slot]}
        </span>
        <span className="truncate text-[13.5px] leading-[18px] text-muted">{sub}</span>
      </div>
      <Button className="min-h-11 rounded-[14px] px-[18px] text-[15px] font-extrabold" onClick={() => onQuickBook(variant.seatId, variant.slot)} disabled={busy}>
        {busy ? t.seats.booking : t.seats.book}
      </Button>
    </section>
  )
}
