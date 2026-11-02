import { supabase } from './supabase'
import { ACTIVE_STATUSES, type Booking, type Profile, type Release, type Seat, type Settings, type SlotChoice } from './types'

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

  async bookSeat(seatId: string, date: string, slot: SlotChoice): Promise<Booking[]> {
    return unwrap(await supabase.rpc('book_seat', { p_seat_id: seatId, p_date: date, p_slot: slot }))
  },

  async cancelBooking(bookingId: string): Promise<Booking> {
    return unwrap(await supabase.rpc('cancel_booking', { p_booking_id: bookingId }))
  },

  async allowedEmailDomains(): Promise<string[]> {
    return unwrap(await supabase.rpc('get_allowed_email_domains'))
  },

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', userId)
    if (error) throw error
  },
}
