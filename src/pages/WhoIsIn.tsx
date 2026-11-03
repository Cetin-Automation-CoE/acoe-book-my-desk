import { useMemo, useState } from 'react'
import { useShell } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { DayStrip } from '../components/DayStrip'
import { ForkKnifeIcon, LunchboxIcon } from '../components/icons'
import { LunchPicker } from '../components/LunchPicker'
import { PageBand, Panel } from '../components/PageBand'
import { ErrorCard, Skeleton } from '../components/States'
import { useAuth } from '../hooks/useAuth'
import { useDayBookings, useDayLunch, useDayReleases, useMyBookings, usePresence, useProfiles, useSeats, useToday } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { useSetLunch } from '../hooks/useLunch'
import { bookableDays, formatBandDate } from '../lib/dates'
import { lunchCounts, lunchOf } from '../lib/lunch'
import { dayOccupancy, occupiedCount, presenceForDay } from '../lib/occupancy'
import { presenceByDay } from '../lib/progress'
import { ACTIVE_STATUSES, type LunchChoice, type Settings } from '../lib/types'

interface Row {
  id: string
  userId: string
  name: string
  seat: string
  sub: string
  held: boolean
  lunch: LunchChoice | null
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
  const lunchPlans = useDayLunch(selected)
  const setLunch = useSetLunch(userId, selected)
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

  // Everyone with a booking that day, plus the owners of seats still held for them.
  const rows: Row[] = presenceForDay(seats.data ?? [], bookings.data ?? [], releases.data ?? [], selected)
    .map((p): Row =>
      p.kind === 'booked'
        ? {
            id: p.booking.id,
            userId: p.booking.user_id,
            name: nameOf(p.booking.user_id),
            seat: p.seat.code,
            sub: p.seat.owner_id === p.booking.user_id ? t.whoIsIn.ownSeat : '',
            held: false,
            lunch: lunchOf(lunchPlans.data ?? [], p.booking.user_id, selected),
          }
        : {
            id: `held:${p.seat.id}`,
            userId: p.seat.owner_id ?? `seat:${p.seat.id}`,
            name: p.seat.owner_id ? nameOf(p.seat.owner_id) : (p.seat.owner_name ?? '…'),
            seat: p.seat.code,
            sub: t.whoIsIn.held,
            held: true,
            lunch: p.seat.owner_id ? lunchOf(lunchPlans.data ?? [], p.seat.owner_id, selected) : null,
          },
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  // Held seats count as taken: nobody else can sit there even if the owner has not booked.
  const occupancy = dayOccupancy(activeSeats, bookings.data ?? [], releases.data ?? [], selected)

  const failed = bookings.error ?? seats.error ?? profiles.error ?? releases.error
  const loading = bookings.isPending || seats.isPending || profiles.isPending || releases.isPending
  const people = new Set((bookings.data ?? []).map((b) => b.user_id)).size
  const iAmIn = rows.some((r) => r.userId === userId)
  const myLunch = lunchOf(lunchPlans.data ?? [], userId, selected)
  const lunch = lunchCounts(lunchPlans.data ?? [], selected, rows.map((r) => r.userId))
  const lunchIcon = (choice: LunchChoice, size: number) =>
    choice === 'box' ? <LunchboxIcon width={size} height={size} strokeWidth={2} /> : <ForkKnifeIcon width={size} height={size} strokeWidth={2} />

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
        ) : rows.length === 0 ? (
          <p className="rounded-3xl bg-white p-5 text-base leading-6 text-ink-soft shadow-card">{t.whoIsIn.empty}</p>
        ) : (
          <>
            {people >= settings.team_day_threshold && (
              <p className="mb-3.5 rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-brand">{t.teamDay.whoIsIn(people)}</p>
            )}
            <div className="mb-[22px] flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-card-raised">
              <span className="flex items-baseline gap-1.5">
                <span className="text-[38px] font-extrabold leading-[42px] tracking-[-0.03em] tabular-nums text-brand">
                  {occupiedCount(occupancy)}
                </span>
                <span className="text-[13px] text-muted">{t.whoIsIn.ofSeats(activeSeats.length)}</span>
              </span>
              <span aria-hidden className="grid grid-cols-[repeat(6,10px)] gap-1.5">
                {activeSeats.map((s) => {
                  const o = occupancy.get(s.id)
                  const color =
                    o?.state === 'taken' ? (o.userId === userId ? 'bg-sky' : 'bg-brand') : o?.state === 'held' ? 'bg-lilac-soft' : 'bg-divider'
                  return <span key={s.id} className={`h-2.5 w-2.5 rounded-[3px] ${color}`} />
                })}
              </span>
            </div>

            {iAmIn && (
              <div className="mb-[22px] rounded-3xl bg-white p-4 shadow-card">
                <LunchPicker label={t.lunch.mine} value={myLunch} busy={setLunch.isPending} onChange={(next) => setLunch.mutate(next)} />
                <p className="mt-2.5 text-[12.5px] leading-[17px] text-muted">{t.lunch.hint}</p>
              </div>
            )}

            <section>
              <div className="mx-1 mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-extrabold text-ink">{t.whoIsIn.people(rows.length)}</h2>
                {lunch.out + lunch.box > 0 && (
                  <span className="flex items-center gap-3 text-[13px] font-bold tabular-nums text-muted">
                    <span className="sr-only">{t.lunch.counts(lunch.out, lunch.box)}</span>
                    <span aria-hidden className="flex items-center gap-1">
                      {lunchIcon('out', 14)}
                      {lunch.out}
                    </span>
                    <span aria-hidden className="flex items-center gap-1">
                      {lunchIcon('box', 14)}
                      {lunch.box}
                    </span>
                  </span>
                )}
              </div>
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
                      {(row.sub || row.lunch) && (
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px] leading-[17px] text-muted">
                          {row.sub && <span>{row.sub}</span>}
                          {row.sub && row.lunch && <span aria-hidden>·</span>}
                          {row.lunch && (
                            <span className="flex shrink-0 items-center gap-1 font-semibold text-brand">
                              {lunchIcon(row.lunch, 13)}
                              {row.lunch === 'box' ? t.lunch.hasBox : t.lunch.goesOut}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-[9px] px-[9px] py-1 text-[13px] font-extrabold tabular-nums text-brand ${row.held ? 'bg-lilac-soft/35' : 'bg-surface'}`}
                    >
                      {row.seat}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </Panel>
    </>
  )
}
