import type { Enums, Tables } from './database.types'

export type Settings = Tables<'settings'>
export type Seat = Tables<'seats'>
export type Booking = Tables<'bookings'>
export type Release = Tables<'seat_releases'>
export type Profile = Pick<Tables<'profiles'>, 'user_id' | 'display_name'>
export type Slot = Enums<'slot'>
export type BookingStatus = Enums<'booking_status'>
export type SlotChoice = Slot | 'FULL'

export const SLOTS: Slot[] = ['AM', 'PM']
export const ACTIVE_STATUSES: BookingStatus[] = ['booked', 'checked_in']

export function slotsFor(choice: SlotChoice): Slot[] {
  return choice === 'FULL' ? SLOTS : [choice]
}
