import { ACTIVE_STATUSES, slotsFor, type Booking, type Release, type Seat, type Slot, type SlotChoice } from './types'

export type SeatKind = 'free' | 'partly' | 'mine' | 'taken' | 'held' | 'inactive'

export interface SeatView {
  seat: Seat
  kind: SeatKind
  wantedSlots: Slot[]
  bookableSlots: Slot[]
  mineSlots: Slot[]
  mineBookings: Booking[]
  takenBy: string[]
  heldSlots: Slot[]
}

interface SeatViewArgs {
  seat: Seat
  date: string
  bookings: Booking[]
  releases: Release[]
  choice: SlotChoice
  userId: string
}

// Pure projection of one seat for the selected date and half-day choice; the database is still
// the authority when the user taps, this only decides what the tile shows and whether it is tappable.
export function seatView({ seat, date, bookings, releases, choice, userId }: SeatViewArgs): SeatView {
  const wantedSlots = slotsFor(choice)
  const view: SeatView = {
    seat,
    kind: 'free',
    wantedSlots,
    bookableSlots: [],
    mineSlots: [],
    mineBookings: [],
    takenBy: [],
    heldSlots: [],
  }

  if (!seat.active) return { ...view, kind: 'inactive' }

  for (const slot of wantedSlots) {
    const booking = bookings.find(
      (b) => b.seat_id === seat.id && b.date === date && b.slot === slot && ACTIVE_STATUSES.includes(b.status),
    )
    if (booking) {
      if (booking.user_id === userId) {
        view.mineSlots.push(slot)
        view.mineBookings.push(booking)
      } else {
        view.takenBy.push(booking.user_id)
      }
      continue
    }
    const released = releases.some((r) => r.seat_id === seat.id && r.date === date && r.slot === slot)
    const heldByOwner = seat.owner_id !== null && seat.owner_id !== userId && !released
    if (heldByOwner) view.heldSlots.push(slot)
    else view.bookableSlots.push(slot)
  }

  if (view.mineSlots.length === wantedSlots.length) view.kind = 'mine'
  else if (view.bookableSlots.length === wantedSlots.length) view.kind = 'free'
  else if (view.bookableSlots.length > 0) view.kind = 'partly'
  else if (view.mineSlots.length > 0) view.kind = 'mine'
  else if (view.takenBy.length > 0) view.kind = 'taken'
  else view.kind = 'held'

  return view
}
