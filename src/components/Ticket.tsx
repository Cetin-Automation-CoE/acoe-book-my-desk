import { useT } from '../hooks/useLang'
import { canCancel, dayLabel } from '../lib/dates'
import type { Booking, Seat, Settings, SlotChoice } from '../lib/types'
import { HalfGlyph } from './HalfGlyph'

interface TicketProps {
  date: string
  bookings: Booking[]
  seats: Seat[]
  settings: Settings
  today: string
  now: Date
  index: number
  busy: boolean
  onCancel: (b: Booking) => void
}

// One ticket per day with bookings: a date stub, a perforation, then one row per half day.
// Today's ticket is blue.
export function Ticket({ date, bookings, seats, settings, today, now, index, busy, onCancel }: TicketProps) {
  const t = useT()
  const label = dayLabel(date, today)
  const codeOf = (id: string) => seats.find((s) => s.id === id)?.code ?? '…'
  const sorted = [...bookings].sort((a, b) => (a.slot === 'AM' ? -1 : 1) - (b.slot === 'AM' ? -1 : 1))
  const hero = date === today
  const codes = [...new Set(sorted.map((b) => codeOf(b.seat_id)))]
  const slotLabel: SlotChoice = sorted.length > 1 ? 'FULL' : sorted[0].slot
  const muted = hero ? 'text-white/70' : 'text-muted'

  return (
    <article
      className={`enter relative flex overflow-hidden rounded-3xl ${hero ? 'bg-mine text-white shadow-ticket' : 'bg-white text-ink shadow-card'}`}
      style={{ '--i': index } as React.CSSProperties}
      aria-label={`${label.relative ?? `${label.weekday} ${label.day} ${label.month}`}: ${codes.join(', ')}`}
    >
      <div className="flex w-[78px] shrink-0 flex-col items-center justify-center gap-px py-4">
        <span className={`text-[11px] font-extrabold uppercase leading-[14px] tracking-[0.08em] ${muted}`}>{label.weekday}</span>
        <span className="text-4xl font-extrabold leading-[38px] tracking-[-0.03em] tabular-nums">{label.day}</span>
        <span className={`text-xs font-semibold leading-[15px] ${muted}`}>{label.month}</span>
        {label.relative && (
          <span
            className={`mt-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.04em] ${
              hero ? 'bg-white/18 text-white' : 'bg-brand/8 text-brand'
            }`}
          >
            {label.relative}
          </span>
        )}
      </div>
      <span aria-hidden className="absolute -top-2.5 left-[68px] h-5 w-5 rounded-full bg-surface" />
      <span aria-hidden className="absolute -bottom-2.5 left-[68px] h-5 w-5 rounded-full bg-surface" />
      <div className={`my-4 shrink-0 border-l-2 border-dashed ${hero ? 'border-white/28' : 'border-line'}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-4 pl-4 pr-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-extrabold leading-6 tracking-[-0.01em] tabular-nums">{codes.join(' · ')}</span>
          <span className={`flex items-center gap-1.5 text-[12.5px] font-bold ${muted}`}>
            <HalfGlyph slot={slotLabel} size={12} />
            {t.slots[slotLabel]}
          </span>
        </div>
        {sorted.map((b) => (
          <div key={b.id} className="flex min-h-8 items-center justify-between gap-2.5">
            <div className="flex min-w-0 flex-col gap-px">
              <span className="text-sm font-bold leading-[18px]">
                {t.slots[b.slot]}
                {codes.length > 1 && ` · ${codeOf(b.seat_id)}`}
              </span>
              <span className={`text-[12.5px] leading-4 ${muted}`}>
                {b.status === 'cancelled' ? t.myBookings.cancelled : canCancel(b, settings, now) ? t.myBookings.cancelUntilStart : t.myBookings.underway}
              </span>
            </div>
            {canCancel(b, settings, now) && (
              <button
                type="button"
                onClick={() => onCancel(b)}
                disabled={busy}
                className={`min-h-[34px] shrink-0 rounded-[10px] border-[1.5px] px-3 text-[13px] font-bold ${
                  hero ? 'border-white/40 text-white' : 'border-brand/25 text-brand'
                }`}
              >
                {t.myBookings.cancel}
              </button>
            )}
          </div>
        ))}
      </div>
    </article>
  )
}
