import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useShell } from '../components/AppShell'
import { DayStrip } from '../components/DayStrip'
import { PageBand, Panel } from '../components/PageBand'
import { SeatGrid } from '../components/SeatGrid'
import { BookSheet, CancelSheet, MineSheet } from '../components/SeatSheets'
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
  canCancelAll,
  dayChoice,
  dayLabel,
  dayTitle,
  formatBandDate,
  minutesSinceMidnightIn,
  slotStart,
  todayIn,
} from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { presenceByDay, teamDayNudge } from '../lib/progress'
import { seatView, type SeatView } from '../lib/seatState'
import { cardVariant, usualSeat } from '../lib/smart'
import { ACTIVE_STATUSES, slotsFor, type Booking, type Settings } from '../lib/types'

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
    () => bookableDays(today, settings.working_days),
    [today, settings.working_days],
  )
  const [selectedDay, setSelected] = useState(today)
  // Fall back to the first bookable day when the selection is stale (day rolled over) or a weekend.
  const selected = days.includes(selectedDay) ? selectedDay : days[0]
  // A booking covers the whole day, or what is left of today once the afternoon has started.
  const choice = dayChoice(selected, today, nowMinutes, settings)
  const started = selected === today && nowMinutes >= slotStart(slotsFor(choice)[0], settings)
  const [pending, setPending] = useState<Pending | null>(null)
  const [toCancel, setToCancel] = useState<Booking[] | null>(null)
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
  const bookView = useMemo(() => (pending?.kind === 'book' ? (views.find((v) => v.seat.id === pending.seatId) ?? null) : null), [pending, views])
  // The manage sheet lists everything I hold on that seat that day, whatever is left of today.
  const mineView = useMemo(() => {
    const seat = pending?.kind === 'mine' ? seats.data?.find((s) => s.id === pending.seatId) : null
    return seat
      ? seatView({ seat, date: selected, bookings: bookings.data ?? [], releases: releases.data ?? [], choice: 'FULL', userId })
      : null
  }, [pending, seats.data, selected, bookings.data, releases.data, userId])

  const mineOnDay = useMemo(
    () => (bookings.data ?? []).filter((b) => b.user_id === userId && ACTIVE_STATUSES.includes(b.status)),
    [bookings.data, userId],
  )
  // One seat per person per day: with a booking, the other free seats are shown but not tappable.
  const blocked = mineOnDay.length > 0
  const myDays = useMemo(
    () => new Set((myUpcoming.data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status)).map((b) => b.date)),
    [myUpcoming.data],
  )
  const ownerSeat = seats.data?.find((s) => s.owner_id === userId && s.active) ?? null
  const usualId = useMemo(() => usualSeat(recent.data ?? [], ownerSeat?.id ?? null), [recent.data, ownerSeat?.id])
  const variant = useMemo(() => cardVariant({ mine: mineOnDay, usualId, views, choice }), [mineOnDay, usualId, views, choice])

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
    mutationFn: (seatId: string) => api.bookSeat(seatId, selected, choice),
    onSuccess: () => {
      toast(t.seats.booked)
      setPending(null)
      refresh()
    },
    onError: fail,
  })

  // One tap from the card: book now, offer Undo while cancelling is still possible.
  const quickBook = useMutation({
    mutationFn: (seatId: string) => api.bookSeat(seatId, selected, choice),
    onSuccess: (created) => {
      const undoable = canCancelAll(created, settings, now)
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
    mutationFn: (list: Booking[]) => Promise.all(list.map((b) => api.cancelBooking(b.id))),
    onSuccess: () => {
      toast(t.myBookings.cancelled)
      setToCancel(null)
      setPending(null)
      refresh()
    },
    onError: fail,
  })

  // Realtime: flash the tile that just changed; drop the book sheet if its seat was taken meanwhile.
  const change = useSeatChange()
  const flashId = change && change.date === selected ? change.seatId : null
  const sheetStillBookable = pending?.kind !== 'book' || !bookView || (bookView.kind === 'free' && !blocked)
  useEffect(() => {
    if (sheetStillBookable) return
    const id = window.setTimeout(() => {
      setPending(null)
      toast(t.errors.seat_taken, 'error')
    }, 0)
    return () => window.clearTimeout(id)
  }, [sheetStillBookable, toast, t])

  const onTap = (view: SeatView) => {
    if (view.kind === 'free' && !blocked) setPending({ kind: 'book', seatId: view.seat.id })
    else if (view.kind === 'mine') setPending({ kind: 'mine', seatId: view.seat.id })
  }

  const busy = book.isPending || quickBook.isPending || cancel.isPending
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
                busy={busy}
                onManage={() => variant.kind === 'booked' && setPending({ kind: 'mine', seatId: variant.bookings[0].seat_id })}
                onQuickBook={(seatId) => quickBook.mutate(seatId)}
              />
            )}
            {nudge && <TeamDayNudge nudge={nudge} today={today} onShow={setSelected} />}
            <div key={selected}>
              <SeatGrid
                views={views}
                people={profiles.data ?? new Map()}
                userId={userId}
                myName={myName}
                blocked={blocked}
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
        view={bookView}
        views={views}
        date={selected}
        today={today}
        settings={settings}
        choice={choice}
        started={started}
        busy={busy}
        onBook={(seatId) => book.mutate(seatId)}
        onClose={() => setPending(null)}
      />
      <MineSheet
        view={mineView}
        views={views}
        date={selected}
        today={today}
        now={now}
        settings={settings}
        busy={busy}
        onCancel={(list) => setToCancel(list)}
        onClose={() => setPending(null)}
      />
      <CancelSheet
        target={toCancel && toCancel.length > 0 ? { bookings: toCancel, date: selected, seatCode: codeOf(toCancel[0].seat_id) } : null}
        today={today}
        busy={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel)}
        onClose={() => setToCancel(null)}
      />
    </>
  )
}
