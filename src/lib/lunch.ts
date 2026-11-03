// Lunch plans: per person and day, a lunchbox or going out, so colleagues can plan lunch together.
// Pure helpers over the lunch_plans rows of one day.

import type { LunchChoice } from './types'

export interface LunchPlanRow {
  user_id: string
  date: string
  lunch: LunchChoice
}

export interface LunchCounts {
  box: number
  out: number
}

// What one person said for the day, or null when they said nothing.
export function lunchOf(plans: readonly LunchPlanRow[], userId: string, date: string): LunchChoice | null {
  return plans.find((p) => p.user_id === userId && p.date === date)?.lunch ?? null
}

// How many of the people in that day bring a box and how many go out; plans of people who are
// not in are ignored.
export function lunchCounts(plans: readonly LunchPlanRow[], date: string, presentIds: Iterable<string>): LunchCounts {
  const present = new Set(presentIds)
  const counts: LunchCounts = { box: 0, out: 0 }
  for (const p of plans) {
    if (p.date === date && present.has(p.user_id)) counts[p.lunch] += 1
  }
  return counts
}
