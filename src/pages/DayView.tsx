import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useShell } from '../components/AppShell'
import { DayStrip } from '../components/DayStrip'
import { PageBand, Panel } from '../components/PageBand'
import { SeatGrid } from '../components/SeatGrid'
import { BookSheet, CancelSheet, MineSheet } from '../components/SeatSheets'
import { SlotToggle } from '../components/SlotToggle'
import { ErrorCard, Skeleton } from '../components/States'
import { TeamDayNudge } from '../components/TeamDayNudge'
import { useToast } from '../components/Toast'
import { TodayCard } from '../components/TodayCard'
import { useAuth } from '../hooks/useAuth'
import {
  useDayBookings,
  useDayReleases,
  useMyBookings,
  useMyRecentBookings,
  useNow,
  usePresence,
  useProfiles,
  useSeats,
} from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { useSeatChange } from '../hooks/useRealtime'
import { api } from '../lib/api'
import {
  addDays,
  bookableDays,
  canCancel,
  clockIn,
  dayLabel,
  dayTitle,
  formatBandDate,
  minutesSinceMidnightIn,
  parseTime,
  slotEnd,
  todayIn,
} from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { presenceByDay, teamDayNudge } from '../lib/progress'
import { seatView, type SeatView } from '../lib/seatState'
import { cardVariant, usualSeat } from '../lib/smart'
import { ACTIVE_STATUSES, SLOTS, type Booking, type Settings, type Slot, type SlotChoice } from '../lib/types'

type Pending = { kind: 'book' | 'mine'; seatId: string }

export function DayView({ settings }: { settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const { name: myName } = useShell()
  const tz = settings.timezone
  const now = useNow()
  const today = todayIn(tz, now)
  const nowMinutes = minutesSinceMidnightIn(tz, now)
  const days = useMemo(
    () => bookableDays(today, settings.booking_window_days, settings.working_days),
    [today, settings.booking_window_days, settings.working_days],
  )
  const [selectedDay, setSelected] = useState(today)
  // Fall back to the first bookable day when the selection is stale (day rolled over) or a weekend.
  const selected = days.includes(selectedDay) ? selectedDay : days[0]
  const [choice, setChoice] = useState<SlotChoice>(() => (nowMinutes >= parseTime(settings.pm_start) ? 'PM' : 'AM'))
  const [pending, setPending] = useState<Pending | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const seats = useSeats()
  const bookings = useDayBookings(selected)
  const releases = useDayReleases(selected)
  const profiles = useProfiles()
  const presenceRows = usePresence(days[0], days[days.length - 1])
  const myUpcoming = useMyBookings(userId, today)
  const recent = useMyRecentBookings(userId, addDays(today, -28), today)

  const views = useMemo(
    () =>
      (seats.data ?? []).map((seat) =>
        seatView({ seat, date: selected, bookings: bookings.data ?? [], releases: releases.data ?? [], choice, userId }),
      ),
    [seats.data, selected, bookings.data, releases.data, choice, userId],
  )
  // The sheets need both halves of one seat, whatever the toggle says.
  const sheetView = useMemo(() => {
    const seat = pending && seats.data?.find((s) => s.id === pending.seatId)
    return seat
      ? seatView({ seat, date: selected, bookings: bookings.data ?? [], releases: releases.data ?? [], choice: 'FULL', userId })
      : null
  }, [pending, seats.data, selected, bookings.data, releases.data, userId])

  const mineOnDay = useMemo(
    () => (bookings.data ?? []).filter((b) => b.user_id === userId && ACTIVE_STATUSES.includes(b.status)),
    [bookings.data, userId],
  )
  const myHeldSlots = useMemo(() => new Set<Slot>(mineOnDay.map((b) => b.slot)), [mineOnDay])
  const endedSlots = useMemo(
    () => new Set<Slot>(selected === today ? SLOTS.filter((s) => nowMinutes >= slotEnd(s, settings)) : []),
    [selected, today, nowMinutes, settings],
  )
  const myDays = useMemo(
    () => new Set((myUpcoming.data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status)).map((b) => b.date)),
    [myUpcoming.data],
  )
  const ownerSeat = seats.data?.find((s) => s.owner_id === userId && s.active) ?? null
  const usualId = useMemo(() => usualSeat(recent.data ?? [], ownerSeat?.id ?? null), [recent.data, ownerSeat?.id])
  const variant = useMemo(
    () =>
      cardVariant({
        selected,
        today,
        nowMinutes,
        settings,
        mine: mineOnDay,
        isOwnerOf: (id) => ownerSeat?.id === id,
        usualId,
        views,
        choice,
      }),
    [selected, today, nowMinutes, settings, mineOnDay, ownerSeat?.id, usualId, views, choice],
  )

  const presence = useMemo(() => presenceByDay(presenceRows.data ?? [], userId), [presenceRows.data, userId])
  const teamDays = useMemo(
    () => new Set(days.filter((d) => (presence.get(d)?.people ?? 0) >= settings.team_day_threshold)),
    [days, presence, settings.team_day_threshold],
  )
  const nudge = teamDayNudge({ days, selected, presence, threshold: settings.team_day_threshold })
  const freeCount = views.filter((v) => v.kind === 'free').length
  const codeOf = (id: string) => seats.data?.find((s) => s.id === id)?.code ?? ''

  const refresh = () => {
    for (const key of ['bookings', 'my-bookings', 'progress']) queryClient.invalidateQueries({ queryKey: [key] })
  }
  const fail = (err: unknown) => {
    toast(errorMessage(err), 'error')
    refresh()
  }

  const book = useMutation({
    mutationFn: (p: { seatId: string; slot: SlotChoice }) => api.bookSeat(p.seatId, selected, p.slot),
    onSuccess: () => {
      toast(t.seats.booked)
      setPending(null)
      refresh()
    },
    onError: fail,
  })

  // One tap from the card: book now, offer Undo while cancelling is still possible.
  const quickBook = useMutation({
    mutationFn: (p: { seatId: string; slot: SlotChoice }) => api.bookSeat(p.seatId, selected, p.slot),
    onSuccess: (created) => {
      const undoable = created.every((b) => canCancel(b, settings, now))
      toast(
        t.seats.booked,
        'info',
        undoable
          ? {
              undo: () =>
                Promise.all(created.map((b) => api.cancelBooking(b.id)))
                  .then(() => refresh())
                  .catch(fail),
            }
          : undefined,
      )
      refresh()
    },
    onError: fail,
  })

  const cancel = useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(bookingId),
    onSuccess: () => {
      toast(t.myBookings.cancelled)
      setToCancel(null)
      refresh()
    },
    onError: fail,
  })

  const checkIn = useMutation({
    mutationFn: (list: Booking[]) => Promise.all(list.map((b) => api.checkIn(b.id))),
    onSuccess: (done) => {
      const at = done[0]?.checked_in_at ? clockIn(tz, new Date(done[0].checked_in_at)) : clockIn(tz, now)
      toast(t.card.checkedInToast(at))
      refresh()
    },
    onError: fail,
  })

  // Realtime: flash the tile that just changed; drop the book sheet if its seat was taken meanwhile.
  const change = useSeatChange()
  const flashId = change && change.date === selected ? change.seatId : null
  const sheetStillBookable =
    pending?.kind !== 'book' ||
    !sheetView ||
    SLOTS.some((s) => sheetView.halves[s]?.state === 'free' && !myHeldSlots.has(s) && !endedSlots.has(s))
  useEffect(() => {
    if (sheetStillBookable) return
    const id = window.setTimeout(() => {
      setPending(null)
      toast(t.errors.seat_taken, 'error')
    }, 0)
    return () => window.clearTimeout(id)
  }, [sheetStillBookable, toast, t])

  const onTap = (view: SeatView) => {
    const bookable = view.bookableSlots.some((s) => !myHeldSlots.has(s) && !endedSlots.has(s))
    if (bookable) setPending({ kind: 'book', seatId: view.seat.id })
    else if (view.mineSlots.length > 0) setPending({ kind: 'mine', seatId: view.seat.id })
  }

  const busy = book.isPending || quickBook.isPending || cancel.isPending || checkIn.isPending
  const loading = seats.isPending || bookings.isPending || profiles.isPending
  const failed = seats.error ?? bookings.error ?? profiles.error
  const retry = () => {
    seats.refetch()
    bookings.refetch()
    releases.refetch()
    profiles.refetch()
  }
  const isRelative = Boolean(dayLabel(selected, today).relative)

  return (
    <>
      <PageBand
        title={dayTitle(selected, today)}
        sub={formatBandDate(selected, isRelative)}
        figure={loading || failed ? undefined : { value: freeCount, label: t.seats.freeSeats(freeCount) }}
      >
        <DayStrip days={days} selected={selected} today={today} onSelect={setSelected} mine={myDays} marks={teamDays} />
        <SlotToggle value={choice} onChange={setChoice} />
      </PageBand>

      <Panel>
        {failed ? (
          <ErrorCard error={failed} onRetry={retry} />
        ) : loading ? (
          <Skeleton />
        ) : (
          <>
            {variant && (
              <TodayCard
                variant={variant}
                seats={seats.data ?? []}
                selected={selected}
                today={today}
                tz={tz}
                busy={busy}
                onCheckInAll={() => variant.kind === 'ring' && checkIn.mutate(variant.openBookings)}
                onManage={() => variant.kind === 'booked' && setPending({ kind: 'mine', seatId: variant.bookings[0].seat_id })}
                onQuickBook={(seatId, slot) => quickBook.mutate({ seatId, slot })}
              />
            )}
            {nudge && <TeamDayNudge nudge={nudge} today={today} onShow={setSelected} />}
            <div key={`${selected}-${choice}`}>
              <SeatGrid
                views={views}
                names={profiles.data ?? new Map()}
                userId={userId}
                myName={myName}
                myHeldSlots={myHeldSlots}
                endedSlots={endedSlots}
                isToday={selected === today}
                tz={tz}
                flashId={flashId}
                selectedId={pending?.kind === 'book' ? pending.seatId : null}
                onTap={onTap}
              />
            </div>
            <p className="mx-1 mt-3.5 text-[13px] leading-[18px] text-muted">
              {t.seats.legend}
              {teamDays.size > 0 && ` ${t.teamDay.legend}`}
            </p>
          </>
        )}
      </Panel>

      <BookSheet
        view={pending?.kind === 'book' ? sheetView : null}
        views={views}
        date={selected}
        today={today}
        nowMinutes={nowMinutes}
        settings={settings}
        userId={userId}
        myHeldSlots={myHeldSlots}
        endedSlots={endedSlots}
        myHeldCode={mineOnDay[0] ? codeOf(mineOnDay[0].seat_id) : null}
        busy={busy}
        onBook={(seatId, slot) => book.mutate({ seatId, slot })}
        onClose={() => setPending(null)}
      />
      <MineSheet
        view={pending?.kind === 'mine' ? sheetView : null}
        views={views}
        date={selected}
        today={today}
        now={now}
        settings={settings}
        userId={userId}
        busy={busy}
        onCheckIn={(b) => checkIn.mutate([b])}
        onCancel={(b) => setToCancel(b)}
        onClose={() => setPending(null)}
      />
      <CancelSheet
        booking={toCancel}
        seatCode={toCancel ? codeOf(toCancel.seat_id) : ''}
        today={today}
        busy={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel.id)}
        onClose={() => setToCancel(null)}
      />
    </>
  )
}
