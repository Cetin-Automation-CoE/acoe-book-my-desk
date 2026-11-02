import { describe, expect, it } from 'vitest'
import { occupiedCount, seatOccupancy } from './occupancy'
import type { Booking, Release, Seat } from './types'

const DATE = '2026-11-04'

function seat(over: Partial<Seat> = {}): Seat {
  return {
    id: 's1',
    floor_id: 'f1',
    code: 'B21101',
    zone: null,
    owner_id: null,
    owner_emails: [],
    owner_name: null,
    active: true,
    sort_order: 0,
    created_at: '',
    ...over,
  }
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    seat_id: 's1',
    user_id: 'ann',
    date: DATE,
    slot: 'AM',
    status: 'booked',
    checked_in_at: null,
    counted_at: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const release = (seatId: string): Release => ({ id: 'r1', seat_id: seatId, date: DATE, slot: 'AM', created_by: 'owner', created_at: '' })

describe('seatOccupancy', () => {
  const seats = [
    seat({ id: 'free' }),
    seat({ id: 'booked' }),
    seat({ id: 'held', owner_id: 'owner' }),
    seat({ id: 'heldByEmail', owner_emails: ['x@cetin.cz'] }),
    seat({ id: 'released', owner_id: 'owner' }),
    seat({ id: 'off', active: false }),
  ]
  const bookings = [booking({ seat_id: 'booked' }), booking({ id: 'b2', seat_id: 'free', slot: 'PM' })]
  const occ = seatOccupancy(seats, bookings, [release('released')], DATE, 'AM')

  it('marks booked seats as taken by the booker', () => {
    expect(occ.get('booked')).toEqual({ state: 'taken', userId: 'ann' })
  })

  it('counts a held seat as occupied even without a booking', () => {
    expect(occ.get('held')).toEqual({ state: 'held' })
    expect(occ.get('heldByEmail')).toEqual({ state: 'held' })
  })

  it('frees a held seat the owner released for that half', () => {
    expect(occ.get('released')).toEqual({ state: 'free' })
  })

  it('ignores the other half day and inactive seats', () => {
    expect(occ.get('free')).toEqual({ state: 'free' })
    expect(occ.has('off')).toBe(false)
  })

  it('sums taken and held seats', () => {
    expect(occupiedCount(occ)).toBe(3)
  })
})
