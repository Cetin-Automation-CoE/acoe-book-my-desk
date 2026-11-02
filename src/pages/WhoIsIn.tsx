import { useMemo, useState } from 'react'
import { DayStrip } from '../components/DayStrip'
import { CheckIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { useDayBookings, usePresence, useProfiles, useSeats, useToday } from '../hooks/useData'
import { bookableDays } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { presenceByDay } from '../lib/progress'
import { SLOTS, type Booking, type Settings, type Slot } from '../lib/types'
import { strings } from '../strings'

interface Row {
  id: string
  name: string
  seat: string
  checkedIn: boolean
}

export function WhoIsIn({ settings }: { settings: Settings }) {
  const { user } = useAuth()
  const userId = user!.id
  const today = useToday(settings.timezone)
  const days = useMemo(
    () => bookableDays(today, settings.booking_window_days, settings.working_days),
    [today, settings.booking_window_days, settings.working_days],
  )
  const [selectedDay, setSelected] = useState(today)
  const selected = days.includes(selectedDay) ? selectedDay : days[0]

  const bookings = useDayBookings(selected)
  const seats = useSeats()
  const profiles = useProfiles()
  const presenceRows = usePresence(days[0], days[days.length - 1])
  const presence = useMemo(() => presenceByDay(presenceRows.data ?? [], userId), [presenceRows.data, userId])
  const teamDays = useMemo(
    () => new Set(days.filter((d) => (presence.get(d)?.people ?? 0) >= settings.team_day_threshold)),
    [days, presence, settings.team_day_threshold],
  )

  const rowsFor = (slot: Slot): Row[] =>
    (bookings.data ?? [])
      .filter((b: Booking) => b.slot === slot)
      .map((b) => ({
        id: b.id,
        name: profiles.data?.get(b.user_id) ?? '…',
        seat: seats.data?.find((s) => s.id === b.seat_id)?.code ?? '',
        checkedIn: b.status === 'checked_in',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

  const failed = bookings.error ?? seats.error ?? profiles.error
  const loading = bookings.isPending || seats.isPending || profiles.isPending
  const total = bookings.data?.length ?? 0
  const people = new Set((bookings.data ?? []).map((b) => b.user_id)).size

  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 bg-surface px-4 pb-3 pt-1">
        <h1 className="mb-3 text-2xl font-bold text-brand">{strings.whoIsIn.title}</h1>
        <DayStrip days={days} selected={selected} today={today} onSelect={setSelected} marks={teamDays} />
      </header>

      {failed ? (
        <p className="text-sm font-semibold text-accent">{errorMessage(failed)}</p>
      ) : loading ? (
        <p className="text-muted">{strings.loading}</p>
      ) : total === 0 ? (
        <p className="mt-2 rounded-xl bg-white p-4 text-neutral-700">{strings.whoIsIn.empty}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-5">
          {people >= settings.team_day_threshold && (
            <p className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white">{strings.teamDay.whoIsIn(people)}</p>
          )}
          {SLOTS.map((slot) => {
            const rows = rowsFor(slot)
            return (
              <section key={slot}>
                <h2 className="mb-2 flex items-baseline justify-between">
                  <span className="font-semibold">{strings.slots[slot]}</span>
                  <span className="text-sm text-muted">{strings.whoIsIn.people(rows.length)}</span>
                </h2>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted">–</p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl bg-white">
                    {rows.map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="flex items-center gap-2">
                          {row.name}
                          {row.checkedIn && <CheckIcon width={18} height={18} className="text-brand" />}
                        </span>
                        <span className="text-sm tabular-nums text-muted">{row.seat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
