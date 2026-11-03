// Progress helpers. The database counts office days and awards badges; these only shape what is
// on screen.

export const BADGES = [
  'first_day',
  'regular',
  'resident',
  'explorer',
  'full_house',
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
