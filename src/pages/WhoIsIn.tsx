import { useMemo, useState } from 'react'
import { useShell } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { DayStrip } from '../components/DayStrip'
import { HalfGlyph } from '../components/HalfGlyph'
import { PageBand, Panel } from '../components/PageBand'
import { ErrorCard, Skeleton } from '../components/States'
import { useAuth } from '../hooks/useAuth'
import { useDayBookings, useDayReleases, useMyBookings, usePresence, useProfiles, useSeats, useToday } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { bookableDays, formatBandDate } from '../lib/dates'
import { occupiedCount, seatOccupancy } from '../lib/occupancy'
import { presenceByDay } from '../lib/progress'
import { ACTIVE_STATUSES, SLOTS, type Booking, type Settings, type Slot } from '../lib/types'

interface Row {
  id: string
  userId: string
  name: string
  seat: string
  sub: string
}

export function WhoIsIn({ settings }: { settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const { name: myName } = useShell()
  const today = useToday(settings.timezone)
  const days = useMemo(
    () => bookableDays(today, settings.working_days),
    [today, settings.working_days],
  )
  const [selectedDay, setSelected] = useState(today)
  const selected = days.includes(selectedDay) ? selectedDay : days[0]

  const bookings = useDayBookings(selected)
  const releases = useDayReleases(selected)
  const seats = useSeats()
  const profiles = useProfiles()
  const myUpcoming = useMyBookings(userId, today)
  const presenceRows = usePresence(days[0], days[days.length - 1])
  const presence = useMemo(() => presenceByDay(presenceRows.data ?? [], userId), [presenceRows.data, userId])
  const teamDays = useMemo(
    () => new Set(days.filter((d) => (presence.get(d)?.people ?? 0) >= settings.team_day_threshold)),
    [days, presence, settings.team_day_threshold],
  )
  const myDays = useMemo(
    () => new Set((myUpcoming.data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status)).map((b) => b.date)),
    [myUpcoming.data],
  )

  const activeSeats = (seats.data ?? []).filter((s) => s.active).sort((a, b) => a.code.localeCompare(b.code))
  const nameOf = (id: string) => (id === userId ? myName : (profiles.data?.get(id)?.name ?? '…'))

  const rowsFor = (slot: Slot): Row[] =>
    (bookings.data ?? [])
      .filter((b: Booking) => b.slot === slot)
      .map((b) => {
        const seat = seats.data?.find((s) => s.id === b.seat_id)
        const sub = seat?.owner_id === b.user_id ? t.mySeat.semiFixed : ''
        return { id: b.id, userId: b.user_id, name: nameOf(b.user_id), seat: seat?.code ?? '', sub }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

  const failed = bookings.error ?? seats.error ?? profiles.error ?? releases.error
  const loading = bookings.isPending || seats.isPending || profiles.isPending || releases.isPending
  const total = bookings.data?.length ?? 0
  const people = new Set((bookings.data ?? []).map((b) => b.user_id)).size

  return (
    <>
      <PageBand title={t.whoIsIn.title} sub={formatBandDate(selected, true)}>
        <DayStrip days={days} selected={selected} today={today} onSelect={setSelected} mine={myDays} marks={teamDays} />
      </PageBand>

      <Panel>
        {failed ? (
          <ErrorCard
            error={failed}
            onRetry={() => {
              bookings.refetch()
              seats.refetch()
              profiles.refetch()
            }}
          />
        ) : loading ? (
          <Skeleton cards={2} />
        ) : total === 0 ? (
          <p className="rounded-3xl bg-white p-5 text-base leading-6 text-ink-soft shadow-card">{t.whoIsIn.empty}</p>
        ) : (
          <>
            {people >= settings.team_day_threshold && (
              <p className="mb-3.5 rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-brand">{t.teamDay.whoIsIn(people)}</p>
            )}
            <div className="mb-[22px] grid grid-cols-2 rounded-3xl bg-white shadow-card-raised">
              {SLOTS.map((slot, i) => {
                // Held seats count as taken: nobody else can sit there even if the owner has not booked.
                const occupancy = seatOccupancy(activeSeats, bookings.data ?? [], releases.data ?? [], selected, slot)
                return (
                  <div key={slot} className={`flex flex-col gap-1 p-4 ${i > 0 ? 'border-l border-rule' : ''}`}>
                    <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.06em] text-muted">
                      <HalfGlyph slot={slot} size={12} />
                      {t.slots[slot]}
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[38px] font-extrabold leading-[42px] tracking-[-0.03em] tabular-nums text-brand">
                        {occupiedCount(occupancy)}
                      </span>
                      <span className="text-[13px] text-muted">{t.whoIsIn.ofSeats(activeSeats.length)}</span>
                    </span>
                    <span aria-hidden className="mt-1 grid grid-cols-[repeat(6,8px)] gap-1">
                      {activeSeats.map((s) => {
                        const o = occupancy.get(s.id)
                        const color =
                          o?.state === 'taken' ? (o.userId === userId ? 'bg-sky' : 'bg-brand') : o?.state === 'held' ? 'bg-lilac-soft' : 'bg-divider'
                        return <span key={s.id} className={`h-2 w-2 rounded-[3px] ${color}`} />
                      })}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-[22px]">
              {SLOTS.map((slot) => {
                const rows = rowsFor(slot)
                return (
                  <section key={slot}>
                    <h2 className="mx-1 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-lg font-extrabold text-ink">
                        <HalfGlyph slot={slot} size={14} className="text-brand" />
                        {t.slots[slot]}
                      </span>
                      <span className="text-[13.5px] font-semibold text-muted">{t.whoIsIn.people(rows.length)}</span>
                    </h2>
                    {rows.length === 0 ? (
                      <p className="mx-1 text-sm text-muted">–</p>
                    ) : (
                      <ul className="overflow-hidden rounded-[22px] bg-white shadow-card">
                        {rows.map((row, i) => (
                          <li
                            key={row.id}
                            className={`enter flex items-center gap-3 py-[11px] pl-3 pr-4 ${i > 0 ? 'border-t border-rule' : ''}`}
                            style={{ '--i': i } as React.CSSProperties}
                          >
                            <Avatar
                              userId={row.userId}
                              name={row.name}
                              src={profiles.data?.get(row.userId)?.avatar}
                              me={row.userId === userId}
                              size={40}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-1.5 text-[15.5px] font-bold leading-5">
                                <span className="truncate">{row.name}</span>
                                {row.userId === userId && (
                                  <span className="shrink-0 rounded-full bg-brand/8 px-[7px] py-px text-[11px] font-extrabold text-brand">{t.you}</span>
                                )}
                              </span>
                              {row.sub && <span className="text-[12.5px] leading-[17px] text-muted">{row.sub}</span>}
                            </span>
                            <span className="shrink-0 rounded-[9px] bg-surface px-[9px] py-1 text-[13px] font-extrabold tabular-nums text-brand">
                              {row.seat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          </>
        )}
      </Panel>
    </>
  )
}
