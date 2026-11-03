import { describe, expect, it } from 'vitest'
import { seatView } from './seatState'
import type { Booking, Release, Seat } from './types'

const DATE = '2026-11-05'

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
    sort_order: 1,
    created_at: '',
    ...over,
  }
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: `b-${Math.random()}`,
    seat_id: 's1',
    user_id: 'me',
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

function release(over: Partial<Release> = {}): Release {
  return { id: 'r1', seat_id: 's1', date: DATE, slot: 'AM', created_by: 'owner', created_at: '', ...over }
}

const view = (args: { seat?: Seat; bookings?: Booking[]; releases?: Release[]; choice?: 'AM' | 'PM' | 'FULL' }) =>
  seatView({
    seat: args.seat ?? seat(),
    date: DATE,
    bookings: args.bookings ?? [],
    releases: args.releases ?? [],
    choice: args.choice ?? 'AM',
    userId: 'me',
  })

describe('seatView for a single half day', () => {
  it('is free when nothing is booked', () => {
    const v = view({})
    expect(v.kind).toBe('free')
    expect(v.bookableSlots).toEqual(['AM'])
  })

  it('is mine when I hold the slot', () => {
    const v = view({ bookings: [booking()] })
    expect(v.kind).toBe('mine')
    expect(v.mineSlots).toEqual(['AM'])
    expect(v.bookableSlots).toEqual([])
  })

  it('is taken when a colleague holds the slot', () => {
    const v = view({ bookings: [booking({ user_id: 'bob' })] })
    expect(v.kind).toBe('taken')
    expect(v.takenBy).toEqual(['bob'])
  })

  it('ignores bookings for other seats, slots and dates', () => {
    const v = view({
      bookings: [
        booking({ seat_id: 's2', user_id: 'bob' }),
        booking({ slot: 'PM', user_id: 'bob' }),
        booking({ date: '2026-11-06', user_id: 'bob' }),
      ],
    })
    expect(v.kind).toBe('free')
  })

  it('ignores cancelled and released bookings', () => {
    const v = view({ bookings: [booking({ status: 'cancelled', user_id: 'bob' }), booking({ status: 'released' })] })
    expect(v.kind).toBe('free')
  })
})

describe('seatView for a full day', () => {
  it('is free when both halves are free', () => {
    const v = view({ choice: 'FULL' })
    expect(v.kind).toBe('free')
    expect(v.bookableSlots).toEqual(['AM', 'PM'])
  })

  it('is taken for the whole day when a colleague has one half', () => {
    const v = view({ choice: 'FULL', bookings: [booking({ user_id: 'bob' })] })
    expect(v.kind).toBe('taken')
    expect(v.bookableSlots).toEqual(['PM'])
    expect(v.takenBy).toEqual(['bob'])
  })

  it('is mine when I hold both halves', () => {
    const v = view({ choice: 'FULL', bookings: [booking(), booking({ slot: 'PM' })] })
    expect(v.kind).toBe('mine')
    expect(v.mineSlots).toEqual(['AM', 'PM'])
  })

  it('is mine with one half when I hold the morning and a colleague the afternoon', () => {
    const v = view({ choice: 'FULL', bookings: [booking(), booking({ slot: 'PM', user_id: 'bob' })] })
    expect(v.kind).toBe('mine')
    expect(v.mineSlots).toEqual(['AM'])
    expect(v.bookableSlots).toEqual([])
  })

  it('is taken when both halves are held by colleagues', () => {
    const v = view({ choice: 'FULL', bookings: [booking({ user_id: 'bob' }), booking({ slot: 'PM', user_id: 'carol' })] })
    expect(v.kind).toBe('taken')
    expect(v.takenBy).toEqual(['bob', 'carol'])
  })
})

describe('seatView for owner-held seats', () => {
  const owned = seat({ owner_id: 'owner' })

  it('is held for everyone else when not released', () => {
    const v = view({ seat: owned })
    expect(v.kind).toBe('held')
    expect(v.heldSlots).toEqual(['AM'])
    expect(v.bookableSlots).toEqual([])
  })

  it('is free for the owner', () => {
    const v = seatView({ seat: owned, date: DATE, bookings: [], releases: [], choice: 'AM', userId: 'owner' })
    expect(v.kind).toBe('free')
  })

  it('is free for others once the owner releases the slot', () => {
    const v = view({ seat: owned, releases: [release()] })
    expect(v.kind).toBe('free')
  })

  it('is still held for the whole day when only the morning is released', () => {
    const v = view({ seat: owned, choice: 'FULL', releases: [release()] })
    expect(v.kind).toBe('held')
    expect(v.bookableSlots).toEqual(['AM'])
    expect(v.heldSlots).toEqual(['PM'])
  })

  it('shows a released slot as taken once someone books it', () => {
    const v = view({ seat: owned, releases: [release()], bookings: [booking({ user_id: 'bob' })] })
    expect(v.kind).toBe('taken')
  })

  it('is held when the seat is assigned by email but the owner has not signed in yet', () => {
    const unclaimed = seat({ owner_id: null, owner_emails: ['owner@cetin.cz'], owner_name: 'Owner One' })
    const v = view({ seat: unclaimed })
    expect(v.kind).toBe('held')
    expect(v.bookableSlots).toEqual([])
  })
})

describe('seatView for inactive seats', () => {
  it('is inactive and never bookable', () => {
    const v = view({ seat: seat({ active: false }), choice: 'FULL' })
    expect(v.kind).toBe('inactive')
    expect(v.bookableSlots).toEqual([])
  })
})
