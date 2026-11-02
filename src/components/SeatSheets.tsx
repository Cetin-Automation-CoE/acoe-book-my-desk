import { useEffect, useState } from 'react'
import { useT } from '../hooks/useLang'
import { canCancel, checkInState, clockIn, formatDayLong, formatTime, slotDeadline, slotRange } from '../lib/dates'
import { roomBlocks } from '../lib/layout'
import { splitCode } from '../lib/people'
import type { SeatView } from '../lib/seatState'
import { SLOTS, slotsFor, type Booking, type Settings, type Slot, type SlotChoice } from '../lib/types'
import { Button } from './Button'
import { HalfGlyph } from './HalfGlyph'
import { CheckIcon } from './icons'
import { MiniRoomMap } from './MiniRoomMap'
import { PAIRS_PER_BLOCK } from './SeatGrid'
import { Sheet } from './Sheet'

function tableOf(views: SeatView[], seatId: string): number {
  return roomBlocks(views, PAIRS_PER_BLOCK).findIndex((block) => block.flat().some((v) => v.seat.id === seatId)) + 1
}

function SeatHead({ view, views, date, today }: { view: SeatView; views: SeatView[]; date: string; today: string }) {
  const t = useT()
  const { prefix, digits } = splitCode(view.seat.code)
  return (
    <div className="mb-4 flex items-center gap-3.5">
      <div className="bg-mine flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[18px] text-white shadow-brand">
        <span className="text-[10px] font-bold leading-3 tracking-[0.05em] opacity-72">{prefix}</span>
        <span className="text-[26px] font-extrabold leading-7 tracking-[-0.02em] tabular-nums">{digits}</span>
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

interface BookSheetProps {
  // The seat's view computed for the full day, so both halves are known whatever the toggle says.
  view: SeatView | null
  views: SeatView[]
  date: string
  today: string
  nowMinutes: number
  settings: Settings
  userId: string
  myHeldSlots: ReadonlySet<Slot>
  endedSlots: ReadonlySet<Slot>
  myHeldCode: string | null
  busy: boolean
  onBook: (seatId: string, slot: SlotChoice) => void
  onClose: () => void
}

export function BookSheet({
  view,
  views,
  date,
  today,
  nowMinutes,
  settings,
  userId,
  myHeldSlots,
  endedSlots,
  myHeldCode,
  busy,
  onBook,
  onClose,
}: BookSheetProps) {
  const t = useT()
  const [slot, setSlot] = useState<SlotChoice>('FULL')

  const seatFree = (s: Slot) => view?.halves[s]?.state === 'free' && !endedSlots.has(s)
  const allowed = (choice: SlotChoice) => slotsFor(choice).every((s) => seatFree(s) && !myHeldSlots.has(s))

  useEffect(() => {
    if (!view) return
    const first = (['FULL', 'AM', 'PM'] as SlotChoice[]).find(allowed) ?? 'FULL'
    setSlot(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.seat.id, date])

  if (!view) return null
  const isToday = date === today
  const ownSeat = view.seat.owner_id === userId && settings.owner_checkin_exempt
  const chosen = slotsFor(slot)
  const walkIn = isToday && chosen.some((s) => nowMinutes > slotDeadline(s, settings))
  const blockedByMine = SLOTS.find((s) => seatFree(s) && myHeldSlots.has(s))
  const onlyHalf = SLOTS.filter(seatFree)
  const note = blockedByMine && myHeldCode ? t.seats.alreadyHave(myHeldCode) : onlyHalf.length === 1 ? t.seats.onlyFree(t.slots[onlyHalf[0]]) : null
  const rule = ownSeat
    ? t.seats.ownRule
    : walkIn
      ? t.seats.walkIn
      : slot === 'FULL'
        ? t.seats.ruleFull(formatTime(settings.am_checkin_deadline), formatTime(settings.pm_checkin_deadline))
        : t.seats.ruleOne(formatTime(slot === 'AM' ? settings.am_checkin_deadline : settings.pm_checkin_deadline))

  return (
    <Sheet open title={t.seats.bookTitle(view.seat.code)} onClose={onClose}>
      <SeatHead view={view} views={views} date={date} today={today} />
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Half day">
          {(['AM', 'PM', 'FULL'] as SlotChoice[]).map((choice) => {
            const ok = allowed(choice)
            const active = slot === choice
            const why = ok ? slotRange(choice, settings) : slotsFor(choice).some((s) => !seatFree(s)) ? t.seats.taken : t.seats.youHave
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!ok}
                onClick={() => setSlot(choice)}
                className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition ${
                  active ? 'border-brand bg-brand/5 text-brand' : 'border-line text-ink'
                } ${ok ? '' : 'opacity-45'}`}
              >
                <HalfGlyph slot={choice} size={16} />
                <span className="text-sm font-extrabold leading-[18px]">{t.slots[choice]}</span>
                <span className="text-[11.5px] font-semibold leading-[14px] tabular-nums text-muted">{why}</span>
              </button>
            )
          })}
        </div>
        {note && <p className="rounded-xl bg-brand/6 px-3 py-2.5 text-[13.5px] font-semibold leading-[19px] text-brand">{note}</p>}
        <p className="text-[13.5px] leading-[19px] text-muted">{rule}</p>
        <div className="mt-0.5 flex flex-col gap-1">
          <Button className="font-extrabold" onClick={() => onBook(view.seat.id, slot)} disabled={busy || !allowed(slot)}>
            {busy ? t.seats.booking : t.seats.bookBtn(t.slots[slot])}
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
  userId: string
  busy: boolean
  onCheckIn: (booking: Booking) => void
  onCancel: (booking: Booking) => void
  onClose: () => void
}

export function MineSheet({ view, views, date, today, now, settings, userId, busy, onCheckIn, onCancel, onClose }: MineSheetProps) {
  const t = useT()
  if (!view) return null
  const owner = view.seat.owner_id === userId
  return (
    <Sheet open title={`${view.seat.code} · ${formatDayLong(date, today)}`} onClose={onClose}>
      <SeatHead view={view} views={views} date={date} today={today} />
      <div className="flex flex-col gap-2">
        {[...view.mineBookings]
          .sort((a, b) => (a.slot === 'AM' ? -1 : 1) - (b.slot === 'AM' ? -1 : 1))
          .map((b) => {
            const state = checkInState(b, settings, owner, now)
            const status =
              state === 'done'
                ? t.card.checkedInAt(b.checked_in_at ? clockIn(settings.timezone, new Date(b.checked_in_at)) : '')
                : state === 'exempt'
                  ? t.myBookings.ownerNoCheckIn
                  : state === 'closed'
                    ? t.myBookings.checkInMissed
                    : state === 'not_today'
                      ? t.myBookings.checkInBy(formatTime(slotDeadlineText(b.slot, settings)))
                      : t.myBookings.checkInBy(formatTime(slotDeadlineText(b.slot, settings)))
            const statusColor = state === 'done' ? 'text-brand' : state === 'closed' ? 'text-accent' : 'text-muted'
            return (
              <div key={b.id} className="flex min-h-[60px] items-center justify-between gap-2.5 rounded-2xl bg-surface py-2 pl-3.5 pr-2.5">
                <div className="flex min-w-0 items-center gap-2.5 text-brand">
                  <HalfGlyph slot={b.slot} size={14} />
                  <div className="flex min-w-0 flex-col gap-px text-ink">
                    <span className="text-[15.5px] font-extrabold">{t.slots[b.slot]}</span>
                    <span className={`flex items-center gap-1 text-[12.5px] ${statusColor}`}>
                      {state === 'done' && <CheckIcon width={13} height={13} strokeWidth={2.5} />}
                      {status}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {state === 'open' && (
                    <Button className="min-h-10 rounded-xl px-3.5 text-sm font-extrabold shadow-none" onClick={() => onCheckIn(b)} disabled={busy}>
                      {t.myBookings.checkIn}
                    </Button>
                  )}
                  {canCancel(b, settings, now) && (
                    <button
                      type="button"
                      onClick={() => onCancel(b)}
                      disabled={busy}
                      className="min-h-10 rounded-xl border-[1.5px] border-accent bg-white px-3.5 text-sm font-extrabold text-accent"
                    >
                      {t.myBookings.cancel}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        <Button variant="ghost" className="mt-1.5 min-h-12 rounded-[14px] text-base" onClick={onClose}>
          {t.close}
        </Button>
      </div>
    </Sheet>
  )
}

const slotDeadlineText = (slot: Slot, s: Settings) => (slot === 'AM' ? s.am_checkin_deadline : s.pm_checkin_deadline)

interface CancelSheetProps {
  booking: Booking | null
  seatCode: string
  today: string
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CancelSheet({ booking, seatCode, today, busy, onConfirm, onClose }: CancelSheetProps) {
  const t = useT()
  if (!booking) return null
  return (
    <Sheet open title={t.myBookings.confirmCancel} heading onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="mb-2.5 text-[15px] leading-[22px] text-ink-soft">
          {seatCode} · {formatDayLong(booking.date, today)}, {t.slots[booking.slot].toLowerCase()}
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
