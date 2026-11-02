import { useMemo, useState } from 'react'
import { DayStrip } from '../components/DayStrip'
import { CheckIcon } from '../components/icons'
import { useDayBookings, useProfiles, useSeats, useToday } from '../hooks/useData'
import { bookableDays } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { SLOTS, type Booking, type Settings, type Slot } from '../lib/types'
import { strings } from '../strings'

interface Row {
  id: string
  name: string
  seat: string
  checkedIn: boolean
}

export function WhoIsIn({ settings }: { settings: Settings }) {
  const today = useToday(settings.timezone)
  const days = useMemo(() => bookableDays(today, settings.booking_window_days), [today, settings.booking_window_days])
  const [selectedDay, setSelected] = useState(today)
  const selected = selectedDay < today ? today : selectedDay

  const bookings = useDayBookings(selected)
  const seats = useSeats()
  const profiles = useProfiles()

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

  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 bg-surface px-4 pb-3 pt-1">
        <h1 className="mb-3 text-2xl font-bold text-brand">{strings.whoIsIn.title}</h1>
        <DayStrip days={days} selected={selected} today={today} onSelect={setSelected} />
      </header>

      {failed ? (
        <p className="text-sm font-semibold text-accent">{errorMessage(failed)}</p>
      ) : loading ? (
        <p className="text-muted">{strings.loading}</p>
      ) : total === 0 ? (
        <p className="mt-2 rounded-xl bg-white p-4 text-neutral-700">{strings.whoIsIn.empty}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-5">
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
