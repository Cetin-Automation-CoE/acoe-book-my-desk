import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { DayStrip } from '../components/DayStrip'
import { SeatGrid } from '../components/SeatGrid'
import { Sheet } from '../components/Sheet'
import { SlotToggle } from '../components/SlotToggle'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useDayBookings, useDayReleases, useProfiles, useSeats, useToday } from '../hooks/useData'
import { api } from '../lib/api'
import { bookableDays, formatDayLong, minutesSinceMidnightIn, parseTime } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { seatView, type SeatView } from '../lib/seatState'
import type { Settings, Slot, SlotChoice } from '../lib/types'
import { strings } from '../strings'

type Pending = { kind: 'book'; view: SeatView; slot: SlotChoice } | { kind: 'mine'; view: SeatView }

export function DayView({ settings }: { settings: Settings }) {
  const { user } = useAuth()
  const userId = user!.id
  const today = useToday(settings.timezone)
  const days = useMemo(() => bookableDays(today, settings.booking_window_days), [today, settings.booking_window_days])
  const [selectedDay, setSelected] = useState(today)
  // If the day rolled over since the last tap, fall back to today rather than a past date.
  const selected = selectedDay < today ? today : selectedDay
  const [choice, setChoice] = useState<SlotChoice>(() =>
    minutesSinceMidnightIn(settings.timezone) >= parseTime(settings.pm_start) ? 'PM' : 'AM',
  )
  const [pending, setPending] = useState<Pending | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()

  const seats = useSeats()
  const bookings = useDayBookings(selected)
  const releases = useDayReleases(selected)
  const profiles = useProfiles()

  const views = useMemo(
    () =>
      (seats.data ?? []).map((seat) =>
        seatView({ seat, date: selected, bookings: bookings.data ?? [], releases: releases.data ?? [], choice, userId }),
      ),
    [seats.data, selected, bookings.data, releases.data, choice, userId],
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
    queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
  }

  const book = useMutation({
    mutationFn: (p: { seatId: string; slot: SlotChoice }) => api.bookSeat(p.seatId, selected, p.slot),
    onSuccess: () => {
      toast(strings.seats.booked)
      setPending(null)
      refresh()
    },
    onError: (err) => {
      toast(errorMessage(err), 'error')
      refresh()
    },
  })

  const cancel = useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(bookingId),
    onSuccess: () => {
      toast(strings.myBookings.cancelled)
      setPending(null)
      refresh()
    },
    onError: (err) => {
      toast(errorMessage(err), 'error')
      refresh()
    },
  })

  const onTap = (view: SeatView) => {
    if (view.bookableSlots.length > 0) {
      const slot: SlotChoice = view.bookableSlots.length === 2 ? 'FULL' : view.bookableSlots[0]
      setPending({ kind: 'book', view, slot })
    } else if (view.mineSlots.length > 0) {
      setPending({ kind: 'mine', view })
    }
  }

  const when = (slot: SlotChoice) => `${formatDayLong(selected, today)}, ${strings.slots[slot].toLowerCase()}`
  const loading = seats.isPending || bookings.isPending || profiles.isPending
  const failed = seats.error ?? bookings.error ?? profiles.error

  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 bg-surface px-4 pb-3 pt-1">
        <h1 className="mb-3 text-2xl font-bold text-brand">{strings.nav.book}</h1>
        <DayStrip days={days} selected={selected} today={today} onSelect={setSelected} />
        <div className="mt-3">
          <SlotToggle value={choice} onChange={setChoice} />
        </div>
      </header>

      <section className="mt-2" aria-live="polite">
        {failed ? (
          <p className="text-sm font-semibold text-accent">{errorMessage(failed)}</p>
        ) : loading ? (
          <p className="text-muted">{strings.loading}</p>
        ) : (
          <>
            <SeatGrid views={views} names={profiles.data ?? new Map()} onTap={onTap} />
            <p className="mt-4 text-sm text-muted">{strings.seats.legend}</p>
          </>
        )}
      </section>

      <Sheet
        open={pending?.kind === 'book'}
        title={pending?.kind === 'book' ? strings.seats.bookPrompt(pending.view.seat.code, when(pending.slot)) : ''}
        onClose={() => setPending(null)}
      >
        {pending?.kind === 'book' && (
          <div className="flex flex-col gap-2">
            {pending.view.kind === 'partly' && (
              <p className="mb-1 text-sm text-muted">
                {strings.slots[pending.view.bookableSlots[0]]} {strings.seats.free.toLowerCase()} only.
              </p>
            )}
            <Button
              onClick={() => book.mutate({ seatId: pending.view.seat.id, slot: pending.slot })}
              disabled={book.isPending}
            >
              {book.isPending ? strings.seats.booking : strings.seats.book}
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={book.isPending}>
              {strings.close}
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet
        open={pending?.kind === 'mine'}
        title={pending?.kind === 'mine' ? `${pending.view.seat.code} · ${formatDayLong(selected, today)}` : ''}
        onClose={() => setPending(null)}
      >
        {pending?.kind === 'mine' && (
          <div className="flex flex-col gap-2">
            {pending.view.mineBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                <span className="font-semibold">{strings.slots[b.slot as Slot]}</span>
                {b.status === 'booked' ? (
                  <Button variant="danger" className="min-h-10" onClick={() => cancel.mutate(b.id)} disabled={cancel.isPending}>
                    {cancel.isPending ? strings.myBookings.cancelling : strings.myBookings.cancel}
                  </Button>
                ) : (
                  <span className="text-sm text-muted">{strings.myBookings.checkedIn}</span>
                )}
              </div>
            ))}
            <Button variant="ghost" onClick={() => setPending(null)}>
              {strings.close}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}
