import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useNow, useProfiles, useSeatSchedule, useSeats } from '../hooks/useData'
import { api } from '../lib/api'
import { bookableDays, dayLabel, minutesSinceMidnightIn, parseTime, todayIn } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { ACTIVE_STATUSES, SLOTS, type Settings, type Slot } from '../lib/types'
import { strings } from '../strings'

type CellKind = 'held' | 'released' | 'booked' | 'mine' | 'ended'

interface Cell {
  kind: CellKind
  label: string
}

const cellStyles: Record<CellKind, string> = {
  held: 'bg-lilac-soft/50 text-brand-deep',
  released: 'border border-dashed border-brand/60 bg-white text-brand',
  booked: 'bg-line text-neutral-700',
  mine: 'bg-brand text-white',
  ended: 'bg-surface text-muted',
}

export function MySeat({ settings }: { settings: Settings }) {
  const { user } = useAuth()
  const userId = user!.id
  const now = useNow()
  const today = todayIn(settings.timezone, now)
  const days = useMemo(
    () => bookableDays(today, settings.booking_window_days, settings.working_days),
    [today, settings.booking_window_days, settings.working_days],
  )
  const seats = useSeats()
  const seat = seats.data?.find((s) => s.owner_id === userId && s.active) ?? null
  const schedule = useSeatSchedule(seat?.id ?? null, today)
  const profiles = useProfiles()
  const toast = useToast()
  const queryClient = useQueryClient()

  const toggle = useMutation({
    mutationFn: ({ date, slot, kind }: { date: string; slot: Slot; kind: CellKind }) =>
      kind === 'released' ? api.unreleaseSeat(seat!.id, date, slot) : api.releaseSeat(seat!.id, date, slot),
    onError: (err) => toast(errorMessage(err), 'error'),
    onSettled: () => {
      for (const key of ['seat-schedule', 'releases', 'bookings', 'my-bookings']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })

  if (seats.isPending) return <p className="text-muted">{strings.loading}</p>
  if (!seat) return <p className="rounded-xl bg-white p-4 text-neutral-700">{strings.mySeat.notOwner}</p>

  const cell = (date: string, slot: Slot): Cell => {
    const booking = schedule.data?.bookings.find(
      (b) => b.date === date && b.slot === slot && ACTIVE_STATUSES.includes(b.status),
    )
    const released = schedule.data?.releases.some((r) => r.date === date && r.slot === slot) ?? false
    const slotEnd = slot === 'AM' ? parseTime(settings.pm_start) : 24 * 60
    if (date === today && minutesSinceMidnightIn(settings.timezone, now) >= slotEnd) return { kind: 'ended', label: '–' }
    if (booking && booking.user_id !== userId) {
      return { kind: 'booked', label: strings.mySeat.bookedBy(profiles.data?.get(booking.user_id) ?? '…') }
    }
    if (booking) return { kind: 'mine', label: strings.seats.mine }
    if (released) return { kind: 'released', label: strings.mySeat.released }
    return { kind: 'held', label: strings.mySeat.held }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand">{strings.mySeat.title}</h1>
      <p className="mb-4 text-neutral-700">{strings.mySeat.intro(seat.code)}</p>

      {schedule.error ? (
        <p className="text-sm font-semibold text-accent">{errorMessage(schedule.error)}</p>
      ) : schedule.isPending ? (
        <p className="text-muted">{strings.loading}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {days.map((date) => {
            const label = dayLabel(date, today)
            return (
              <li key={date} className="grid grid-cols-[5.5rem_1fr_1fr] items-center gap-2">
                <div className="leading-tight">
                  <div className="font-semibold">{label.relative ?? label.weekday}</div>
                  <div className="text-xs text-muted">
                    {label.relative ? `${label.weekday} ` : ''}
                    {label.day} {label.month}
                  </div>
                </div>
                {SLOTS.map((slot) => {
                  const c = cell(date, slot)
                  const actionable = c.kind === 'held' || c.kind === 'released' || c.kind === 'mine'
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!actionable || toggle.isPending}
                      onClick={() => toggle.mutate({ date, slot, kind: c.kind })}
                      aria-label={`${label.weekday} ${label.day} ${label.month} ${strings.slots[slot]}: ${c.label}`}
                      className={`flex min-h-14 flex-col items-start justify-center rounded-lg px-3 py-1.5 text-left transition active:scale-[0.98] disabled:active:scale-100 ${cellStyles[c.kind]}`}
                    >
                      <span className="text-xs opacity-80">{strings.slots[slot]}</span>
                      <span className="line-clamp-1 text-sm font-semibold">{c.label}</span>
                    </button>
                  )
                })}
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted">{strings.mySeat.hint}</p>
    </>
  )
}
