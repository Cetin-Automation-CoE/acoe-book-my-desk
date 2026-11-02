import { supabase } from './supabase'
import {
  ACTIVE_STATUSES,
  type Achievement,
  type Booking,
  type OutcomeRow,
  type PresenceRow,
  type Profile,
  type Release,
  type Seat,
  type Settings,
  type SlotChoice,
  type UserStats,
} from './types'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw res.error
  return res.data as T
}

export const api = {
  async settings(): Promise<Settings> {
    return unwrap(await supabase.from('settings').select('*').single())
  },

  async seats(): Promise<Seat[]> {
    return unwrap(await supabase.from('seats').select('*').order('sort_order').order('code'))
  },

  async profiles(): Promise<Profile[]> {
    return unwrap(await supabase.from('profiles').select('user_id, display_name'))
  },

  async bookingsForDate(date: string): Promise<Booking[]> {
    return unwrap(await supabase.from('bookings').select('*').eq('date', date).in('status', ACTIVE_STATUSES))
  },

  async releasesForDate(date: string): Promise<Release[]> {
    return unwrap(await supabase.from('seat_releases').select('*').eq('date', date))
  },

  async releasesForSeat(seatId: string, fromDate: string): Promise<Release[]> {
    return unwrap(await supabase.from('seat_releases').select('*').eq('seat_id', seatId).gte('date', fromDate))
  },

  async bookingsForSeat(seatId: string, fromDate: string): Promise<Booking[]> {
    return unwrap(
      await supabase.from('bookings').select('*').eq('seat_id', seatId).gte('date', fromDate).in('status', ACTIVE_STATUSES),
    )
  },

  async myBookings(userId: string, fromDate: string): Promise<Booking[]> {
    return unwrap(
      await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .neq('status', 'cancelled')
        .order('date')
        .order('slot'),
    )
  },

  // Who is booked on each day of the window (team-day marks and nudges).
  async bookingsForRange(from: string, to: string): Promise<PresenceRow[]> {
    return unwrap(
      await supabase.from('bookings').select('date, user_id').gte('date', from).lte('date', to).in('status', ACTIVE_STATUSES),
    )
  },

  async myStats(userId: string): Promise<UserStats | null> {
    return unwrap(await supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle())
  },

  async myBadges(userId: string): Promise<Achievement[]> {
    return unwrap(await supabase.from('achievements').select('*').eq('user_id', userId).order('earned_at'))
  },

  // Final outcomes of my past bookings (checked in or auto-released) for the check-in rate.
  async myOutcomes(userId: string, fromDate: string): Promise<OutcomeRow[]> {
    return unwrap(
      await supabase
        .from('bookings')
        .select('date, status')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .in('status', ['checked_in', 'released']),
    )
  },

  async bookSeat(seatId: string, date: string, slot: SlotChoice): Promise<Booking[]> {
    return unwrap(await supabase.rpc('book_seat', { p_seat_id: seatId, p_date: date, p_slot: slot }))
  },

  async cancelBooking(bookingId: string): Promise<Booking> {
    return unwrap(await supabase.rpc('cancel_booking', { p_booking_id: bookingId }))
  },

  async checkIn(bookingId: string): Promise<Booking> {
    return unwrap(await supabase.rpc('check_in', { p_booking_id: bookingId }))
  },

  async releaseSeat(seatId: string, date: string, slot: SlotChoice): Promise<void> {
    const { error } = await supabase.rpc('release_my_seat', { p_seat_id: seatId, p_date: date, p_slot: slot })
    if (error) throw error
  },

  async unreleaseSeat(seatId: string, date: string, slot: SlotChoice): Promise<void> {
    const { error } = await supabase.rpc('unrelease_my_seat', { p_seat_id: seatId, p_date: date, p_slot: slot })
    if (error) throw error
  },

  async allowedEmailDomains(): Promise<string[]> {
    return unwrap(await supabase.rpc('get_allowed_email_domains'))
  },

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', userId)
    if (error) throw error
  },
}
