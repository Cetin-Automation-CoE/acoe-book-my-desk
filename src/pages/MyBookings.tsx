import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { PageBand, Panel } from '../components/PageBand'
import { CancelSheet } from '../components/SeatSheets'
import { ErrorCard, Skeleton } from '../components/States'
import { Ticket } from '../components/Ticket'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useMyBookings, useNow, useSeats, useStats } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { api } from '../lib/api'
import { todayIn } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { ACTIVE_STATUSES, type Booking, type Settings } from '../lib/types'

export function MyBookings({ settings }: { settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const now = useNow()
  const today = todayIn(settings.timezone, now)
  const bookings = useMyBookings(userId, today)
  const seats = useSeats()
  const stats = useStats(userId)
  const toast = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [toCancel, setToCancel] = useState<Booking[] | null>(null)

  const refresh = () => {
    for (const key of ['my-bookings', 'bookings', 'progress']) queryClient.invalidateQueries({ queryKey: [key] })
  }

  const cancel = useMutation({
    mutationFn: (list: Booking[]) => Promise.all(list.map((b) => api.cancelBooking(b.id))),
    onSuccess: () => {
      toast(t.myBookings.cancelled)
      setToCancel(null)
      refresh()
    },
    onError: (err) => {
      toast(errorMessage(err), 'error')
      refresh()
    },
  })

  const byDate = new Map<string, Booking[]>()
  for (const b of bookings.data ?? []) {
    if (!ACTIVE_STATUSES.includes(b.status)) continue
    byDate.set(b.date, [...(byDate.get(b.date) ?? []), b])
  }
  const loading = bookings.isPending || seats.isPending
  const failed = bookings.error ?? seats.error
  const streak = stats.data?.current_streak ?? 0

  return (
    <>
      <PageBand
        title={t.myBookings.title}
        sub={loading || failed ? undefined : t.myBookings.upcoming(byDate.size)}
        figure={stats.isPending || stats.error ? undefined : { value: streak, label: t.progress.streak }}
      />

      <Panel>
        {failed ? (
          <ErrorCard
            error={failed}
            onRetry={() => {
              bookings.refetch()
              seats.refetch()
            }}
          />
        ) : loading ? (
          <Skeleton cards={2} />
        ) : byDate.size === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-3xl bg-white px-5 py-[22px] shadow-card">
            <div aria-hidden className="flex gap-1.5">
              <span className="h-[30px] w-11 rounded-[9px] border-[1.5px] border-dashed border-brand/35" />
              <span className="h-[30px] w-11 rounded-[9px] border-[1.5px] border-dashed border-brand/35" />
            </div>
            <p className="text-base leading-6 text-ink-soft">{t.myBookings.empty}</p>
            <Button className="min-h-[52px] self-stretch text-base font-extrabold" onClick={() => navigate('/')}>
              {t.myBookings.findSeat}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {[...byDate.entries()].map(([date, list], i) => (
              <Ticket
                key={date}
                date={date}
                bookings={list}
                seats={seats.data ?? []}
                settings={settings}
                today={today}
                now={now}
                index={i}
                busy={cancel.isPending}
                onCancel={setToCancel}
              />
            ))}
          </div>
        )}
      </Panel>

      <CancelSheet
        target={
          toCancel && toCancel.length > 0
            ? { bookings: toCancel, date: toCancel[0].date, seatCode: seats.data?.find((s) => s.id === toCancel[0].seat_id)?.code ?? '' }
            : null
        }
        today={today}
        busy={cancel.isPending}
        onConfirm={() => toCancel && cancel.mutate(toCancel)}
        onClose={() => setToCancel(null)}
      />
    </>
  )
}
