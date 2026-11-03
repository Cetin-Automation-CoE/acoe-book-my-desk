import { describe, expect, it } from 'vitest'
import { dayOccupancy, occupiedCount, presenceFor, presenceForDay, seatOccupancy } from './occupancy'
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

describe('presenceFor', () => {
  const seats = [
    seat({ id: 'free', code: 'B21105' }),
    seat({ id: 'booked', code: 'B21106' }),
    seat({ id: 'held', code: 'B21102', owner_id: 'martin', owner_name: 'Martin M' }),
    seat({ id: 'heldByEmail', code: 'B21101', owner_emails: ['x@cetin.cz'], owner_name: 'Jiří F' }),
    seat({ id: 'released', code: 'B21103', owner_id: 'owner' }),
    seat({ id: 'ownerElsewhere', code: 'B21104', owner_id: 'bob' }),
    seat({ id: 'heldButBooked', code: 'B21107', owner_id: 'carl' }),
    seat({ id: 'off', code: 'B21108', owner_id: 'dan', active: false }),
  ]
  const bookings = [
    booking({ id: 'b1', seat_id: 'booked', user_id: 'ann' }),
    booking({ id: 'b2', seat_id: 'free', user_id: 'bob' }),
    booking({ id: 'b3', seat_id: 'heldButBooked', user_id: 'eve' }),
    booking({ id: 'b4', seat_id: 'held', user_id: 'martin', slot: 'PM' }),
    booking({ id: 'b5', seat_id: 'free', user_id: 'zed', status: 'cancelled' }),
  ]
  const rows = presenceFor(seats, bookings, [release('released')], DATE, 'AM')

  it('lists every active booking of that half day with its seat', () => {
    const booked = rows.filter((r) => r.kind === 'booked')
    expect(booked.map((r) => r.kind === 'booked' && [r.booking.id, r.seat.code])).toEqual([
      ['b1', 'B21106'],
      ['b2', 'B21105'],
      ['b3', 'B21107'],
    ])
  })

  it('lists the owner of a seat still held for them', () => {
    const held = rows.filter((r) => r.kind === 'held')
    expect(held.map((r) => r.seat.id)).toEqual(['held', 'heldByEmail'])
  })

  it('skips a held seat the owner released, booked elsewhere, or that someone booked', () => {
    const ids = rows.filter((r) => r.kind === 'held').map((r) => r.seat.id)
    expect(ids).not.toContain('released')
    expect(ids).not.toContain('ownerElsewhere')
    expect(ids).not.toContain('heldButBooked')
    expect(ids).not.toContain('off')
  })

  it('ignores the other half day', () => {
    const pm = presenceFor(seats, bookings, [], DATE, 'PM')
    expect(pm.map((r) => (r.kind === 'booked' ? r.booking.id : `held:${r.seat.id}`))).toEqual([
      'b4',
      'held:heldByEmail',
      'held:released',
      'held:ownerElsewhere',
      'held:heldButBooked',
    ])
  })
})

describe('dayOccupancy', () => {
  const seats = [
    seat({ id: 'free' }),
    seat({ id: 'pmOnly' }),
    seat({ id: 'held', owner_id: 'owner' }),
    seat({ id: 'halfReleased', owner_id: 'owner2' }),
    seat({ id: 'released', owner_id: 'owner3' }),
    seat({ id: 'heldThenBooked', owner_id: 'owner4' }),
  ]
  const bookings = [
    booking({ id: 'b1', seat_id: 'pmOnly', user_id: 'ann', slot: 'PM' }),
    booking({ id: 'b2', seat_id: 'heldThenBooked', user_id: 'bob', slot: 'PM' }),
  ]
  const releases: Release[] = [
    { ...release('halfReleased'), id: 'r1', slot: 'AM' },
    { ...release('released'), id: 'r2', slot: 'AM' },
    { ...release('released'), id: 'r3', slot: 'PM' },
    { ...release('heldThenBooked'), id: 'r4', slot: 'PM' },
  ]
  const occ = dayOccupancy(seats, bookings, releases, DATE)

  it('is taken when any half is booked', () => {
    expect(occ.get('pmOnly')).toEqual({ state: 'taken', userId: 'ann' })
    expect(occ.get('heldThenBooked')).toEqual({ state: 'taken', userId: 'bob' })
  })

  it('is held while any half is still held', () => {
    expect(occ.get('held')).toEqual({ state: 'held' })
    expect(occ.get('halfReleased')).toEqual({ state: 'held' })
  })

  it('is free when nothing is booked and nothing is held', () => {
    expect(occ.get('free')).toEqual({ state: 'free' })
    expect(occ.get('released')).toEqual({ state: 'free' })
    expect(occupiedCount(occ)).toBe(4)
  })
})

describe('presenceForDay', () => {
  const seats = [
    seat({ id: 'a', code: 'B21105' }),
    seat({ id: 'b', code: 'B21106' }),
    seat({ id: 'held', code: 'B21102', owner_id: 'martin' }),
    seat({ id: 'ownerBooked', code: 'B21101', owner_id: 'jiri' }),
    seat({ id: 'ownerElsewhere', code: 'B21104', owner_id: 'bob' }),
  ]
  const bookings = [
    booking({ id: 'b1', seat_id: 'a', user_id: 'ann', slot: 'AM' }),
    booking({ id: 'b2', seat_id: 'a', user_id: 'ann', slot: 'PM' }),
    booking({ id: 'b3', seat_id: 'b', user_id: 'bob', slot: 'PM' }),
    booking({ id: 'b4', seat_id: 'ownerBooked', user_id: 'jiri', slot: 'AM' }),
  ]
  const rows = presenceForDay(seats, bookings, [], DATE)

  it('lists each person once, with their seat', () => {
    expect(rows.filter((r) => r.kind === 'booked').map((r) => r.kind === 'booked' && [r.booking.user_id, r.seat.code])).toEqual([
      ['ann', 'B21105'],
      ['bob', 'B21106'],
      ['jiri', 'B21101'],
    ])
  })

  it('lists an owner as held only when they have no booking that day', () => {
    expect(rows.filter((r) => r.kind === 'held').map((r) => r.seat.id)).toEqual(['held'])
  })

  it('keeps a held seat while any half is still held', () => {
    const half = presenceForDay(seats, [], [{ ...release('held'), slot: 'AM' }], DATE)
    expect(half.filter((r) => r.kind === 'held').map((r) => r.seat.id)).toEqual(['held', 'ownerBooked', 'ownerElsewhere'])
    const both = presenceForDay(seats, [], [{ ...release('held'), id: 'r1', slot: 'AM' }, { ...release('held'), id: 'r2', slot: 'PM' }], DATE)
    expect(both.filter((r) => r.kind === 'held').map((r) => r.seat.id)).toEqual(['ownerBooked', 'ownerElsewhere'])
  })
})
