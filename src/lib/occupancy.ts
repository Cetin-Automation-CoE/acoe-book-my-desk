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

export type Presence = { kind: 'booked'; booking: Booking; seat: Seat } | { kind: 'held'; seat: Seat }

// Who counts as in for one half day: everyone with a booking, then the owners of seats still held
// for them — a hold is the owner's default reservation. An owner who booked another seat, released
// this half day, or whose seat someone else booked is not listed twice.
export function presenceFor(
  seats: readonly Seat[],
  bookings: readonly Booking[],
  releases: readonly Release[],
  date: string,
  slot: Slot,
): Presence[] {
  const active = bookings.filter((b) => b.date === date && b.slot === slot && ACTIVE_STATUSES.includes(b.status))
  const seatById = new Map(seats.map((s) => [s.id, s]))
  const out: Presence[] = []
  for (const booking of active) {
    const seat = seatById.get(booking.seat_id)
    if (seat) out.push({ kind: 'booked', booking, seat })
  }
  for (const seat of seats) {
    if (!seat.active) continue
    if (seat.owner_id === null && seat.owner_emails.length === 0) continue
    if (active.some((b) => b.seat_id === seat.id || (seat.owner_id !== null && b.user_id === seat.owner_id))) continue
    if (releases.some((r) => r.seat_id === seat.id && r.date === date && r.slot === slot)) continue
    out.push({ kind: 'held', seat })
  }
  return out
}

export function occupiedCount(occupancy: ReadonlyMap<string, Occupancy>): number {
  let n = 0
  for (const o of occupancy.values()) if (o.state !== 'free') n += 1
  return n
}
