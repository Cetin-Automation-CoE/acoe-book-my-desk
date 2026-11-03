import { ACTIVE_STATUSES, slotsFor, type Booking, type Release, type Seat, type Slot, type SlotChoice } from './types'

export type SeatKind = 'free' | 'mine' | 'taken' | 'held' | 'inactive'
export type HalfState = 'free' | 'mine' | 'taken' | 'held'
export interface Half {
  state: HalfState
  booking?: Booking
}

export interface SeatView {
  seat: Seat
  kind: SeatKind
  wantedSlots: Slot[]
  bookableSlots: Slot[]
  mineSlots: Slot[]
  mineBookings: Booking[]
  takenBy: string[]
  heldSlots: Slot[]
  // Per wanted half: who has it (for captions, glyphs and the mini map).
  halves: Partial<Record<Slot, Half>>
}

interface SeatViewArgs {
  seat: Seat
  date: string
  bookings: Booking[]
  releases: Release[]
  choice: SlotChoice
  userId: string
}

// Pure projection of one seat for the selected date and the wanted halves (the whole day, or what is
// left of today); the database is still the authority when the user taps, this only decides what
// the tile shows and whether it is tappable. A seat is free only when every wanted half is free.
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
    halves: {},
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
        view.halves[slot] = { state: 'mine', booking }
      } else {
        view.takenBy.push(booking.user_id)
        view.halves[slot] = { state: 'taken', booking }
      }
      continue
    }
    const released = releases.some((r) => r.seat_id === seat.id && r.date === date && r.slot === slot)
    // A seat assigned by email is held even before its owner has signed in (owner_id still null).
    const semiFixed = seat.owner_id !== null || seat.owner_emails.length > 0
    const heldByOwner = semiFixed && seat.owner_id !== userId && !released
    if (heldByOwner) {
      view.heldSlots.push(slot)
      view.halves[slot] = { state: 'held' }
    } else {
      view.bookableSlots.push(slot)
      view.halves[slot] = { state: 'free' }
    }
  }

  if (view.mineSlots.length > 0) view.kind = 'mine'
  else if (view.bookableSlots.length === wantedSlots.length) view.kind = 'free'
  else if (view.takenBy.length > 0) view.kind = 'taken'
  else view.kind = 'held'

  return view
}
