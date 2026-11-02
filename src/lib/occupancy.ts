import { ACTIVE_STATUSES, type Booking, type Release, type Seat, type Slot } from './types'

export type Occupancy = { state: 'free' } | { state: 'taken'; userId: string } | { state: 'held' }

// Who has each active seat for one half day: booked by someone, held for its owner, or free.
// A held seat counts as taken for availability even though nobody has booked it.
export function seatOccupancy(
  seats: readonly Seat[],
  bookings: readonly Booking[],
  releases: readonly Release[],
  date: string,
  slot: Slot,
): Map<string, Occupancy> {
  const out = new Map<string, Occupancy>()
  for (const seat of seats) {
    if (!seat.active) continue
    const booking = bookings.find(
      (b) => b.seat_id === seat.id && b.date === date && b.slot === slot && ACTIVE_STATUSES.includes(b.status),
    )
    if (booking) {
      out.set(seat.id, { state: 'taken', userId: booking.user_id })
      continue
    }
    const semiFixed = seat.owner_id !== null || seat.owner_emails.length > 0
    const released = releases.some((r) => r.seat_id === seat.id && r.date === date && r.slot === slot)
    out.set(seat.id, semiFixed && !released ? { state: 'held' } : { state: 'free' })
  }
  return out
}

export function occupiedCount(occupancy: ReadonlyMap<string, Occupancy>): number {
  let n = 0
  for (const o of occupancy.values()) if (o.state !== 'free') n += 1
  return n
}
