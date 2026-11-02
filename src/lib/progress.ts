// Progress and team-day helpers. The database counts office days and awards badges; these only
// shape what is on screen.

export const BADGES = [
  'first_day',
  'regular',
  'resident',
  'explorer',
  'full_house',
  'team_day',
  'on_a_roll',
  'full_week',
] as const
export type BadgeKey = (typeof BADGES)[number]

export interface Presence {
  people: number
  others: number
}

export function presenceByDay(
  bookings: readonly { date: string; user_id: string }[],
  userId: string,
): Map<string, Presence> {
  const byDay = new Map<string, Set<string>>()
  for (const b of bookings) {
    const set = byDay.get(b.date) ?? new Set<string>()
    set.add(b.user_id)
    byDay.set(b.date, set)
  }
  const out = new Map<string, Presence>()
  for (const [date, users] of byDay) {
    out.set(date, { people: users.size, others: users.size - (users.has(userId) ? 1 : 0) })
  }
  return out
}

export type Nudge =
  | { kind: 'team_day'; date: string; others: number }
  | { kind: 'join'; date: string; others: number }
  | { kind: 'some'; date: string; others: number }

export function teamDayNudge({
  days,
  selected,
  presence,
  threshold,
}: {
  days: readonly string[]
  selected: string
  presence: ReadonlyMap<string, Presence>
  threshold: number
}): Nudge | null {
  const isTeamDay = (date: string) => (presence.get(date)?.people ?? 0) >= threshold
  const current = presence.get(selected)
  if (isTeamDay(selected)) return { kind: 'team_day', date: selected, others: current?.others ?? 0 }
  const next = days.find((d) => d !== selected && isTeamDay(d))
  if (next) return { kind: 'join', date: next, others: presence.get(next)!.others }
  if (current && current.others > 0) return { kind: 'some', date: selected, others: current.others }
  return null
}
