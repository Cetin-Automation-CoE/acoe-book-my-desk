import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Avatar } from '../components/Avatar'
import { StarIcon } from '../components/icons'
import { PageBand, Panel } from '../components/PageBand'
import { ErrorCard, Skeleton } from '../components/States'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useNow, useProfiles, useSeatSchedule, useSeats } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { api } from '../lib/api'
import { bookableDays, dayChoice, dayLabel, formatDayShort, minutesSinceMidnightIn, todayIn } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { shortName } from '../lib/people'
import { ACTIVE_STATUSES, slotsFor, type Settings } from '../lib/types'

type CellKind = 'held' | 'released' | 'booked' | 'mine'

interface Cell {
  kind: CellKind
  label: string
  userId?: string
}

const cellStyles: Record<CellKind, string> = {
  held: 'bg-lilac-soft/32 text-brand-deep',
  released: 'border-[1.5px] border-dashed border-brand/50 bg-white text-brand',
  booked: 'bg-taken text-ink-soft',
  mine: 'bg-mine text-white shadow-cell-mine',
}

export function MySeat({ settings }: { settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const now = useNow()
  const today = todayIn(settings.timezone, now)
  const nowMinutes = minutesSinceMidnightIn(settings.timezone, now)
  const days = useMemo(
    () => bookableDays(today, settings.working_days),
    [today, settings.working_days],
  )
  const seats = useSeats()
  const seat = seats.data?.find((s) => s.owner_id === userId && s.active) ?? null
  const schedule = useSeatSchedule(seat?.id ?? null, today)
  const profiles = useProfiles()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Releasing or taking back covers the whole day, or what is left of today.
  const toggle = useMutation({
    mutationFn: ({ date, kind }: { date: string; kind: CellKind }) => {
      const choice = dayChoice(date, today, nowMinutes, settings)
      return kind === 'released' ? api.unreleaseSeat(seat!.id, date, choice) : api.releaseSeat(seat!.id, date, choice)
    },
    onError: (err) => toast(errorMessage(err), 'error'),
    onSettled: () => {
      for (const key of ['seat-schedule', 'releases', 'bookings', 'my-bookings']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })

  const cell = (date: string): Cell => {
    const dayBookings = schedule.data?.bookings.filter((b) => b.date === date && ACTIVE_STATUSES.includes(b.status)) ?? []
    const other = dayBookings.find((b) => b.user_id !== userId)
    if (other) {
      return { kind: 'booked', label: shortName(profiles.data?.get(other.user_id)?.name ?? '…'), userId: other.user_id }
    }
    if (dayBookings.length > 0) return { kind: 'mine', label: t.seats.mine }
    const remaining = slotsFor(dayChoice(date, today, nowMinutes, settings))
    const released = remaining.every((slot) => schedule.data?.releases.some((r) => r.date === date && r.slot === slot))
    return released ? { kind: 'released', label: t.mySeat.released } : { kind: 'held', label: t.mySeat.held }
  }

  return (
    <>
      <PageBand title={t.mySeat.title}>
        {seat && (
          <div className="mt-[18px] flex items-center gap-3.5 rounded-[20px] border border-white/16 bg-white/10 p-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
              <StarIcon width={28} height={28} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-extrabold leading-7 tracking-[-0.01em] tabular-nums">{seat.code}</div>
              <div className="text-[13.5px] leading-[19px] text-white/74">{t.mySeat.semiFixed}</div>
            </div>
          </div>
        )}
      </PageBand>

      <Panel>
        {seats.error || schedule.error ? (
          <ErrorCard
            error={seats.error ?? schedule.error}
            onRetry={() => {
              seats.refetch()
              schedule.refetch()
            }}
          />
        ) : seats.isPending || (seat && schedule.isPending) ? (
          <Skeleton cards={1} />
        ) : !seat ? (
          <p className="rounded-3xl bg-white p-5 text-base leading-6 text-ink-soft shadow-card">{t.mySeat.notOwner}</p>
        ) : (
          <>
            <p className="mx-1 mb-4 text-[14.5px] leading-[21px] text-ink-soft">{t.mySeat.intro(seat.code)}</p>
            <ul className="flex flex-col gap-2">
              {days.map((date, i) => {
                const label = dayLabel(date, today)
                const c = cell(date)
                const actionable = c.kind !== 'booked'
                return (
                  <li
                    key={date}
                    className="enter grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2"
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <div className="pl-1 leading-tight">
                      <div className="text-[15px] font-extrabold">{label.relative ?? label.weekdayLong.charAt(0).toUpperCase() + label.weekdayLong.slice(1)}</div>
                      <div className="text-xs text-muted">{formatDayShort(date)}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!actionable || toggle.isPending}
                      onClick={() => toggle.mutate({ date, kind: c.kind })}
                      aria-label={`${label.weekday} ${label.day} ${label.month}: ${c.label}`}
                      className={`flex min-h-[54px] items-center gap-[7px] rounded-2xl px-3.5 text-left text-sm font-bold transition active:scale-[0.97] disabled:active:scale-100 ${cellStyles[c.kind]}`}
                    >
                      {c.kind === 'held' && <StarIcon width={14} height={14} className="shrink-0" strokeWidth={2.2} />}
                      {c.kind === 'booked' && c.userId && (
                        <Avatar userId={c.userId} name={c.label} src={profiles.data?.get(c.userId)?.avatar} size={22} className="!bg-white" />
                      )}
                      <span className="truncate">{c.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mx-1 mt-4 text-[13px] leading-[18px] text-muted">{t.mySeat.hint}</p>
          </>
        )}
      </Panel>
    </>
  )
}
