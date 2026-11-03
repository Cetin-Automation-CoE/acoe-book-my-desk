import { useT } from '../hooks/useLang'
import { canCancelAll, dayLabel } from '../lib/dates'
import type { Booking, Seat, Settings } from '../lib/types'

interface TicketProps {
  date: string
  bookings: Booking[]
  seats: Seat[]
  settings: Settings
  today: string
  now: Date
  index: number
  busy: boolean
  onCancel: (bookings: Booking[]) => void
}

// One ticket per day with a booking: a date stub, a perforation, then the seat and its state.
// Today's ticket is blue.
export function Ticket({ date, bookings, seats, settings, today, now, index, busy, onCancel }: TicketProps) {
  const t = useT()
  const label = dayLabel(date, today)
  const codeOf = (id: string) => seats.find((s) => s.id === id)?.code ?? '…'
  const hero = date === today
  const codes = [...new Set(bookings.map((b) => codeOf(b.seat_id)))]
  const cancellable = canCancelAll(bookings, settings, now)
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
            className={`mt-1.5 max-w-full truncate rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.02em] ${
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
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 py-4 pl-4 pr-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xl font-extrabold leading-6 tracking-[-0.01em] tabular-nums">{codes.join(' · ')}</span>
          <span className={`text-[12.5px] leading-4 ${muted}`}>{cancellable ? t.myBookings.cancelUntilStart : t.myBookings.underway}</span>
        </div>
        {cancellable && (
          <button
            type="button"
            onClick={() => onCancel(bookings)}
            disabled={busy}
            className={`min-h-[34px] shrink-0 rounded-[10px] border-[1.5px] px-3 text-[13px] font-bold ${
              hero ? 'border-white/40 text-white' : 'border-brand/25 text-brand'
            }`}
          >
            {t.myBookings.cancel}
          </button>
        )}
      </div>
    </article>
  )
}
