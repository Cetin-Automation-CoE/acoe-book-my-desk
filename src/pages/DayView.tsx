import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '../components/AppShell'
import { DayStrip } from '../components/DayStrip'
import { DiceIcon } from '../components/icons'
import { PageBand, Panel } from '../components/PageBand'
import { SeatGrid } from '../components/SeatGrid'
import { BookSheet, CancelSheet, MineSheet, type FavouriteControl } from '../components/SeatSheets'
import { ErrorCard, Skeleton } from '../components/States'
import { useToast } from '../components/Toast'
import { TodayCard } from '../components/TodayCard'
import { useAuth } from '../hooks/useAuth'
import { useDayPicker } from '../hooks/useDayPicker'
import {
  useDayBookings,
  useDayLunch,
  useDayReleases,
  useFavouriteSeat,
  useMyBookings,
  useMyRecentBookings,
  useNow,
  usePresence,
  useProfiles,
  useSeats,
} from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { useSetFavourite } from '../hooks/useFavourite'
import { useSetLunch } from '../hooks/useLunch'
import { useSeatChange } from '../hooks/useRealtime'
import { api } from '../lib/api'
import {
  addDays,
  canCancelAll,
  dayChoice,
  dayLabel,
  dayTitle,
  formatBandDate,
  minutesSinceMidnightIn,
  slotStart,
  todayIn,
} from '../lib/dates'
import { celebrateBooking, reducedMotion, tick } from '../lib/delight'
import { errorCode, errorMessage } from '../lib/errors'
import { lunchOf } from '../lib/lunch'
import { presenceByDay } from '../lib/progress'
import { seatView, type SeatView } from '../lib/seatState'
import { cardVariant, usualSeat } from '../lib/smart'
import { hopTimes, pickRandomSeat, shuffleHops, surpriseCandidates } from '../lib/surprise'
import { ACTIVE_STATUSES, slotsFor, type Booking, type Settings } from '../lib/types'

// surprise: the seat came from "Surprise me".
type Pending = { kind: 'book' | 'mine'; seatId: string; surprise?: boolean }

const SHUFFLE_HOPS = 12
const SHUFFLE_MS = 1200
const LANDING_PAUSE_MS = 350
// How many times a surprise spins again by itself when someone books its seat first.
const SURPRISE_RETRIES = 3


export function DayView({ settings }: { settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const { name: myName } = useShell()
  const tz = settings.timezone
  const now = useNow()
  const today = todayIn(tz, now)
  const nowMinutes = minutesSinceMidnightIn(tz, now)
  const picker = useDayPicker(today, settings)
  const { selected, bookable } = picker
  // A booking covers the whole day, or what is left of today once the afternoon has started.
  const choice = dayChoice(selected, today, nowMinutes, settings)
  const started = selected === today && nowMinutes >= slotStart(slotsFor(choice)[0], settings)
  const [pending, setPending] = useState<Pending | null>(null)
  const [toCancel, setToCancel] = useState<Booking[] | null>(null)
  // "Surprise me": the seat the shuffle is passing over, its timers, and the retry bookkeeping.
  const [spotlight, setSpotlight] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const spinTimers = useRef<number[]>([])
  const surpriseTries = useRef(0)
  const surpriseTaken = useRef<Set<string>>(new Set())
  const seatsRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const seats = useSeats()
  const bookings = useDayBookings(selected)
  const releases = useDayReleases(selected)
  const lunchPlans = useDayLunch(selected)
  const profiles = useProfiles()
  const presenceRows = usePresence(bookable[0], bookable[bookable.length - 1])
  const myUpcoming = useMyBookings(userId, today)
  const recent = useMyRecentBookings(userId, addDays(today, -28), today)
  const favourite = useFavouriteSeat(userId)
  const setFavourite = useSetFavourite(userId)

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
  const ownerSeat = seats.data?.find((s) => s.owner_id === userId && s.active) ?? null
  // One seat per person per day: with a booking, the other free seats are shown but not tappable.
  // A seat owner books their own seat only, so every other seat is blocked for them.
  const blocked = mineOnDay.length > 0
  const blockedFor = (v: SeatView) => blocked || (ownerSeat !== null && v.seat.id !== ownerSeat.id)
  const myDays = useMemo(
    () => new Set((myUpcoming.data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status)).map((b) => b.date)),
    [myUpcoming.data],
  )
  // A seat owner sits at their own seat, so they have no favourite to pick.
  const favouriteId = ownerSeat ? null : (favourite.data ?? null)
  const usualId = useMemo(
    () => usualSeat(recent.data ?? [], ownerSeat?.id ?? null, favouriteId),
    [recent.data, ownerSeat?.id, favouriteId],
  )
  const variant = useMemo(
    () => cardVariant({ mine: mineOnDay, usualId, views, choice, lockedToUsual: ownerSeat !== null }),
    [mineOnDay, usualId, views, choice, ownerSeat],
  )

  // Colleagues with a booking on the selected day, for the line under the card.
  const presence = useMemo(() => presenceByDay(presenceRows.data ?? [], userId), [presenceRows.data, userId])
  const othersIn = presence.get(selected)?.others ?? 0
  const freeCount = views.filter((v) => v.kind === 'free').length
  const codeOf = (id: string) => seats.data?.find((s) => s.id === id)?.code ?? ''
  const favouriteFor = (seatId: string | undefined): FavouriteControl | undefined =>
    seatId && !ownerSeat
      ? {
          isFavourite: favouriteId === seatId,
          busy: setFavourite.isPending,
          onToggle: () => setFavourite.mutate({ seatId: favouriteId === seatId ? null : seatId, code: codeOf(seatId) }),
        }
      : undefined

  const refresh = () => {
    for (const key of ['bookings', 'my-bookings', 'progress']) queryClient.invalidateQueries({ queryKey: [key] })
  }
  const fail = (err: unknown) => {
    toast(errorMessage(err), 'error')
    refresh()
  }

  const stopSpin = useCallback(() => {
    for (const id of spinTimers.current) window.clearTimeout(id)
    spinTimers.current = []
    setSpotlight(null)
    setSpinning(false)
  }, [])
  // A new day (or leaving the tab) ends any shuffle in progress.
  useEffect(() => stopSpin, [selected, stopSpin])

  // Shuffle across the free seats and land on a random one; `avoid` steers it away from seats just
  // shown or just taken, unless nothing else is left.
  const spin = (avoid: ReadonlySet<string>) => {
    stopSpin()
    setPending(null)
    let pool = surpriseCandidates(views, blockedFor, avoid)
    if (pool.length === 0) pool = surpriseCandidates(views, blockedFor, surpriseTaken.current)
    const pick = pickRandomSeat(pool)
    if (!pick) {
      toast(t.errors.seat_taken, 'error')
      return
    }
    const land = () => {
      spinTimers.current = []
      setSpotlight(null)
      setSpinning(false)
      setPending({ kind: 'book', seatId: pick, surprise: true })
    }
    if (pool.length === 1 || reducedMotion()) {
      land()
      return
    }
    const hops = shuffleHops(pool, pick, SHUFFLE_HOPS)
    const times = hopTimes(hops.length, SHUFFLE_MS)
    setSpinning(true)
    // The seats sit below the card: bring them up so the shuffle is seen, and the landing seat too.
    seatsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    hops.forEach((id, i) =>
      spinTimers.current.push(
        window.setTimeout(() => {
          setSpotlight(id)
          tick()
          if (i === hops.length - 1) document.querySelector(`[data-seat="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, times[i]),
      ),
    )
    spinTimers.current.push(window.setTimeout(land, times[times.length - 1] + LANDING_PAUSE_MS))
  }

  const surpriseMe = () => {
    surpriseTries.current = 0
    surpriseTaken.current = new Set()
    spin(new Set())
  }

  const book = useMutation({
    mutationFn: ({ seatId }: { seatId: string; surprise?: boolean }) => api.bookSeat(seatId, selected, choice),
    onSuccess: () => {
      celebrateBooking()
      toast(t.seats.booked)
      setPending(null)
      refresh()
    },
    onError: (err, { seatId, surprise }) => {
      // Someone took the surprise seat first: spin again by itself, a few times.
      if (surprise && errorCode(err) === 'seat_taken' && surpriseTries.current < SURPRISE_RETRIES) {
        surpriseTries.current += 1
        surpriseTaken.current.add(seatId)
        toast(t.surprise.retaken)
        refresh()
        spin(surpriseTaken.current)
        return
      }
      fail(err)
    },
  })

  // One tap from the card: book now, offer Undo while cancelling is still possible.
  const quickBook = useMutation({
    mutationFn: (seatId: string) => api.bookSeat(seatId, selected, choice),
    onSuccess: (created) => {
      celebrateBooking()
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

  const setLunch = useSetLunch(userId, selected)
  const myLunch = lunchOf(lunchPlans.data ?? [], userId, selected)

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
  const sheetStillBookable = pending?.kind !== 'book' || !bookView || (bookView.kind === 'free' && !blockedFor(bookView))
  useEffect(() => {
    if (sheetStillBookable) return
    const id = window.setTimeout(() => {
      setPending(null)
      toast(t.errors.seat_taken, 'error')
    }, 0)
    return () => window.clearTimeout(id)
  }, [sheetStillBookable, toast, t])

  const onTap = (view: SeatView) => {
    if (spinning) return
    if (view.kind === 'free' && !blockedFor(view)) setPending({ kind: 'book', seatId: view.seat.id })
    else if (view.kind === 'mine') setPending({ kind: 'mine', seatId: view.seat.id })
  }

  const busy = book.isPending || quickBook.isPending || cancel.isPending
  // Surprise me is for someone without a seat that day; seat owners sit at their own seat.
  const canSurprise = mineOnDay.length === 0 && !ownerSeat && surpriseCandidates(views, blockedFor).length > 0
  const loading = seats.isPending || bookings.isPending || profiles.isPending
  const failed = seats.error ?? bookings.error ?? profiles.error
  const retry = () => {
    seats.refetch()
    bookings.refetch()
    releases.refetch()
    profiles.refetch()
  }
  const label = dayLabel(selected, today)
  const isRelative = Boolean(label.relative)
  const when = label.relative ? label.relative.toLowerCase() : `${label.weekday} ${label.day} ${label.month}`

  return (
    <>
      <PageBand
        title={dayTitle(selected, today)}
        sub={formatBandDate(selected, isRelative)}
        figure={loading || failed ? undefined : { value: freeCount, label: t.seats.freeSeats(freeCount) }}
      >
        <DayStrip picker={picker} today={today} mine={myDays} />
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
                favouriteId={favouriteId}
                onManage={() => variant.kind === 'booked' && setPending({ kind: 'mine', seatId: variant.bookings[0].seat_id })}
                onQuickBook={(seatId) => quickBook.mutate(seatId)}
                lunch={{ value: myLunch, busy: setLunch.isPending, onChange: (next) => setLunch.mutate(next) }}
              />
            )}
            {(othersIn > 0 || canSurprise) && (
              <div className="mb-3.5 flex min-h-9 items-center justify-between gap-3 pl-1">
                <p className="min-w-0 text-[13px] text-muted">{othersIn > 0 ? t.seats.colleaguesIn(othersIn, when) : null}</p>
                {canSurprise && (
                  <button
                    type="button"
                    onClick={surpriseMe}
                    disabled={spinning || busy}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3.5 text-[13.5px] font-extrabold text-brand shadow-card transition active:scale-95 disabled:opacity-70"
                  >
                    <DiceIcon width={18} height={18} strokeWidth={2} className={spinning ? 'motion-safe:animate-spin' : ''} />
                    {spinning ? t.surprise.picking : t.surprise.button}
                  </button>
                )}
              </div>
            )}
            <div key={selected} ref={seatsRef} className="scroll-mt-4">
              <SeatGrid
                views={views}
                people={profiles.data ?? new Map()}
                userId={userId}
                myName={myName}
                isBlocked={blockedFor}
                flashId={flashId}
                selectedId={pending?.kind === 'book' ? pending.seatId : null}
                favouriteId={favouriteId}
                spotlightId={spotlight}
                onTap={onTap}
              />
            </div>
            <p className="mx-1 mt-3.5 text-[13px] leading-[18px] text-muted">
              {ownerSeat ? t.seats.ownerLegend : t.seats.legend}
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
        favourite={favouriteFor(bookView?.seat.id)}
        surprise={pending?.kind === 'book' && pending.surprise ? { onSpinAgain: () => spin(new Set([pending.seatId])) } : undefined}
        onBook={(seatId) => book.mutate({ seatId, surprise: pending?.surprise })}
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
        favourite={favouriteFor(mineView?.seat.id)}
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
