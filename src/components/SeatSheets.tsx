import { useT } from '../hooks/useLang'
import { canCancelAll, formatDayLong, formatTime, slotRange } from '../lib/dates'
import { roomBlocks } from '../lib/layout'
import type { SeatView } from '../lib/seatState'
import type { Booking, Settings, SlotChoice } from '../lib/types'
import { Button } from './Button'
import { HeartIcon } from './icons'
import { MiniRoomMap } from './MiniRoomMap'
import { PAIRS_PER_BLOCK } from './SeatGrid'
import { Sheet } from './Sheet'

function tableOf(views: SeatView[], seatId: string): number {
  return roomBlocks(views, PAIRS_PER_BLOCK).findIndex((block) => block.flat().some((v) => v.seat.id === seatId)) + 1
}

function SeatHead({ view, views, date, today }: { view: SeatView; views: SeatView[]; date: string; today: string }) {
  const t = useT()
  return (
    <div className="mb-4 flex items-center gap-3.5">
      <div className="bg-mine flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[18px] text-white shadow-brand">
        <span className="text-[13.5px] font-extrabold tracking-[-0.01em] tabular-nums">{view.seat.code}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[21px] font-extrabold leading-[26px] tracking-[-0.01em]">{t.seats.bookTitle(view.seat.code)}</h2>
        <p className="mt-0.5 text-sm leading-[19px] text-muted">
          {formatDayLong(date, today)} · {t.seats.table(tableOf(views, view.seat.id))}
        </p>
      </div>
      <MiniRoomMap views={views} seatId={view.seat.id} />
    </div>
  )
}

// What the booking covers: the whole day, or what is left of today once the afternoon has started.
function Cover({ choice, settings }: { choice: SlotChoice; settings: Settings }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand bg-brand/5 px-4 py-3 text-brand">
      <span className="text-[15.5px] font-extrabold leading-5">{choice === 'FULL' ? t.slots.FULL : t.seats.restOfDay}</span>
      <span className="text-[13px] font-semibold tabular-nums text-brand/70">{slotRange(choice, settings)}</span>
    </div>
  )
}

// The heart on a seat sheet: make this seat my favourite, or remove it. Not offered to seat owners.
export interface FavouriteControl {
  isFavourite: boolean
  busy: boolean
  onToggle: () => void
}

function FavouriteToggle({ control }: { control: FavouriteControl }) {
  const t = useT()
  const { isFavourite, busy, onToggle } = control
  return (
    <button
      type="button"
      aria-pressed={isFavourite}
      onClick={onToggle}
      disabled={busy}
      className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-surface px-3.5 text-left transition active:scale-[0.98] disabled:opacity-60"
    >
      <HeartIcon filled={isFavourite} width={20} height={20} strokeWidth={2} className={isFavourite ? 'text-accent' : 'text-brand'} />
      <span className={`flex-1 text-[15px] font-bold ${isFavourite ? 'text-ink' : 'text-brand'}`}>
        {isFavourite ? t.favourite.is : t.favourite.make}
      </span>
      {isFavourite && <span className="text-[13px] font-bold text-muted">{t.favourite.remove}</span>}
    </button>
  )
}

interface BookSheetProps {
  view: SeatView | null
  views: SeatView[]
  date: string
  today: string
  settings: Settings
  choice: SlotChoice
  // The day has started: a booking made now cannot be cancelled.
  started: boolean
  busy: boolean
  favourite?: FavouriteControl
  onBook: (seatId: string) => void
  onClose: () => void
}

export function BookSheet({ view, views, date, today, settings, choice, started, busy, favourite, onBook, onClose }: BookSheetProps) {
  const t = useT()
  if (!view) return null
  const rule = started ? t.seats.startedRule : t.seats.cancelRule(formatTime(settings.am_start))
  return (
    <Sheet open title={t.seats.bookTitle(view.seat.code)} onClose={onClose}>
      <SeatHead view={view} views={views} date={date} today={today} />
      <div className="flex flex-col gap-3.5">
        <Cover choice={choice} settings={settings} />
        <p className="text-[13.5px] leading-[19px] text-muted">{rule}</p>
        {favourite && <FavouriteToggle control={favourite} />}
        <div className="mt-0.5 flex flex-col gap-1">
          <Button className="font-extrabold" onClick={() => onBook(view.seat.id)} disabled={busy}>
            {busy ? t.seats.booking : t.seats.book}
          </Button>
          <Button variant="ghost" className="min-h-12 rounded-[14px] text-base" onClick={onClose} disabled={busy}>
            {t.close}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

interface MineSheetProps {
  view: SeatView | null
  views: SeatView[]
  date: string
  today: string
  now: Date
  settings: Settings
  busy: boolean
  favourite?: FavouriteControl
  onCancel: (bookings: Booking[]) => void
  onClose: () => void
}

// My booking on this seat for the day: one row, cancellable until the day starts.
export function MineSheet({ view, views, date, today, now, settings, busy, favourite, onCancel, onClose }: MineSheetProps) {
  const t = useT()
  if (!view || view.mineBookings.length === 0) return null
  const mine = [...view.mineBookings].sort((a, b) => (a.slot === 'AM' ? -1 : 1) - (b.slot === 'AM' ? -1 : 1))
  const cover: SlotChoice = mine.length > 1 ? 'FULL' : mine[0].slot
  const cancellable = canCancelAll(mine, settings, now)
  return (
    <Sheet open title={`${view.seat.code} · ${formatDayLong(date, today)}`} onClose={onClose}>
      <SeatHead view={view} views={views} date={date} today={today} />
      <div className="flex flex-col gap-2">
        <div className="flex min-h-[60px] items-center justify-between gap-2.5 rounded-2xl bg-surface py-2 pl-3.5 pr-2.5">
          <div className="flex min-w-0 flex-col gap-px text-ink">
            <span className="text-[15.5px] font-extrabold">{t.slots[cover]}</span>
            <span className="text-[12.5px] text-muted">
              {slotRange(cover, settings)} · {cancellable ? t.myBookings.cancelUntilStart : t.myBookings.underway}
            </span>
          </div>
          {cancellable && (
            <button
              type="button"
              onClick={() => onCancel(mine)}
              disabled={busy}
              className="min-h-10 shrink-0 rounded-xl border-[1.5px] border-accent bg-white px-3.5 text-sm font-extrabold text-accent"
            >
              {t.myBookings.cancel}
            </button>
          )}
        </div>
        {favourite && <FavouriteToggle control={favourite} />}
        <Button variant="ghost" className="mt-1.5 min-h-12 rounded-[14px] text-base" onClick={onClose}>
          {t.close}
        </Button>
      </div>
    </Sheet>
  )
}

export interface CancelTarget {
  bookings: Booking[]
  date: string
  seatCode: string
}

interface CancelSheetProps {
  target: CancelTarget | null
  today: string
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CancelSheet({ target, today, busy, onConfirm, onClose }: CancelSheetProps) {
  const t = useT()
  if (!target) return null
  return (
    <Sheet open title={t.myBookings.confirmCancel} heading onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="mb-2.5 text-[15px] leading-[22px] text-ink-soft">
          {target.seatCode} · {formatDayLong(target.date, today)}
        </p>
        <Button variant="danger" className="font-extrabold" onClick={onConfirm} disabled={busy}>
          {busy ? t.myBookings.cancelling : t.myBookings.yesCancel}
        </Button>
        <Button variant="ghost" className="min-h-12 rounded-[14px] text-base" onClick={onClose} disabled={busy}>
          {t.myBookings.keep}
        </Button>
      </div>
    </Sheet>
  )
}
