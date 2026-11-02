import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { keys, useMyBookings, useProfiles, useSeats, useToday } from '../hooks/useData'
import { api } from '../lib/api'
import { formatDayLong } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { Booking, Settings } from '../lib/types'
import { strings } from '../strings'

function statusText(b: Booking): string {
  switch (b.status) {
    case 'checked_in':
      return strings.myBookings.checkedIn
    case 'released':
      return strings.myBookings.released
    case 'cancelled':
      return strings.myBookings.cancelled
    default:
      return ''
  }
}

export function MyBookings({ settings }: { settings: Settings }) {
  const { user, signOut } = useAuth()
  const userId = user!.id
  const today = useToday(settings.timezone)
  const bookings = useMyBookings(userId, today)
  const seats = useSeats()
  const profiles = useProfiles()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [toCancel, setToCancel] = useState<Booking | null>(null)

  const seatCode = (id: string) => seats.data?.find((s) => s.id === id)?.code ?? '…'

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: () => {
      toast(strings.myBookings.cancelled)
      setToCancel(null)
    },
    onError: (err) => toast(errorMessage(err), 'error'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const byDate = new Map<string, Booking[]>()
  for (const b of bookings.data ?? []) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b])

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-brand">{strings.myBookings.title}</h1>

      {bookings.error ? (
        <p className="text-sm font-semibold text-accent">{errorMessage(bookings.error)}</p>
      ) : bookings.isPending ? (
        <p className="text-muted">{strings.loading}</p>
      ) : byDate.size === 0 ? (
        <p className="rounded-xl bg-white p-4 text-neutral-700">{strings.myBookings.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {[...byDate.entries()].map(([date, list]) => (
            <li key={date}>
              <h2 className="mb-2 font-semibold">{formatDayLong(date, today)}</h2>
              <ul className="flex flex-col gap-2">
                {list.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
                    <div>
                      <div className="font-semibold tabular-nums">
                        {seatCode(b.seat_id)} <span className="font-normal text-muted">· {strings.slots[b.slot]}</span>
                      </div>
                      {statusText(b) && <div className="text-sm text-muted">{statusText(b)}</div>}
                    </div>
                    {b.status === 'booked' && (
                      <Button variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setToCancel(b)}>
                        {strings.myBookings.cancel}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <ProfileCard userId={userId} email={user?.email ?? ''} name={profiles.data?.get(userId) ?? ''} onSignOut={signOut} />

      <Sheet open={toCancel !== null} title={strings.myBookings.confirmCancel} onClose={() => setToCancel(null)}>
        {toCancel && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-neutral-700">
              {seatCode(toCancel.seat_id)} · {formatDayLong(toCancel.date, today)}, {strings.slots[toCancel.slot].toLowerCase()}
            </p>
            <Button variant="danger" onClick={() => cancel.mutate(toCancel.id)} disabled={cancel.isPending}>
              {cancel.isPending ? strings.myBookings.cancelling : strings.myBookings.yesCancel}
            </Button>
            <Button variant="ghost" onClick={() => setToCancel(null)} disabled={cancel.isPending}>
              {strings.myBookings.keep}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function ProfileCard({
  userId,
  email,
  name,
  onSignOut,
}: {
  userId: string
  email: string
  name: string
  onSignOut: () => Promise<unknown>
}) {
  const [value, setValue] = useState<string | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const current = value ?? name

  const save = useMutation({
    mutationFn: (displayName: string) => api.updateDisplayName(userId, displayName),
    onSuccess: () => {
      toast(strings.profile.saved)
      setValue(null)
      queryClient.invalidateQueries({ queryKey: keys.profiles })
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = current.trim()
    if (trimmed && trimmed !== name) save.mutate(trimmed)
  }

  return (
    <form onSubmit={submit} className="mt-10 flex flex-col gap-3 rounded-xl bg-white p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{strings.profile.nameLabel}</span>
        <input
          type="text"
          maxLength={80}
          value={current}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-11 rounded-lg border border-line-strong px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <span className="text-xs text-muted">{strings.profile.nameHint}</span>
      </label>
      {value !== null && value.trim() !== name && (
        <Button type="submit" disabled={save.isPending || !value.trim()}>
          {strings.profile.save}
        </Button>
      )}
      <p className="text-sm text-muted">{strings.profile.signedInAs(email)}</p>
      <Button variant="secondary" onClick={() => onSignOut()}>
        {strings.auth.signOut}
      </Button>
    </form>
  )
}
