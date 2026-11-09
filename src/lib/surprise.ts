// "Surprise me": a random free seat for the day, revealed by a short shuffle across the free seats.
// Pure helpers; the database is still the authority when the seat is booked.

import type { SeatView } from './seatState'

export type Rng = () => number

// Seats a surprise may land on: free for what a booking would cover (seatView decides that: taken,
// held, released and rest-of-today are all in there), not blocked for me, and not ruled out.
export function surpriseCandidates(
  views: readonly SeatView[],
  isBlocked: (view: SeatView) => boolean,
  exclude: ReadonlySet<string> = new Set(),
): string[] {
  return views.filter((v) => v.kind === 'free' && !isBlocked(v) && !exclude.has(v.seat.id)).map((v) => v.seat.id)
}

export function pickRandomSeat(candidates: readonly string[], rng: Rng = Math.random): string | null {
  if (candidates.length === 0) return null
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]
}

// The seats the highlight visits on its way to the pick: never the same seat twice in a row, the
// hop before the last is not the pick (so the landing is a real move), and the last hop is the pick.
export function shuffleHops(candidates: readonly string[], pick: string, hops: number, rng: Rng = Math.random): string[] {
  const others = candidates.filter((id) => id !== pick)
  if (others.length === 0 || hops <= 1) return [pick]
  const path: string[] = []
  let prev: string | null = null
  for (let i = 0; i < hops - 1; i++) {
    const beforeLanding = i === hops - 2
    let options = candidates.filter((id) => id !== prev && !(beforeLanding && id === pick))
    if (options.length === 0) options = others
    const next = options[Math.min(options.length - 1, Math.floor(rng() * options.length))]
    path.push(next)
    prev = next
  }
  path.push(pick)
  return path
}

// When each hop shows, in ms from the start: quick at first, slowing down towards the landing.
export function hopTimes(hops: number, totalMs: number): number[] {
  if (hops <= 1) return [0]
  const gaps = Array.from({ length: hops - 1 }, (_, i) => 1 + 4 * (i / Math.max(1, hops - 2)) ** 2)
  const sum = gaps.reduce((a, b) => a + b, 0)
  const times = [0]
  for (const gap of gaps) times.push(times[times.length - 1] + (gap / sum) * totalMs)
  return times.map(Math.round)
}
