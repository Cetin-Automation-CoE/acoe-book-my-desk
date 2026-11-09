import { describe, expect, it } from 'vitest'
import { seatView } from './seatState'
import { hopTimes, pickRandomSeat, shuffleHops, surpriseCandidates, type Rng } from './surprise'
import type { Booking, Release, Seat } from './types'

const DATE = '2026-11-05'

function seat(id: string, over: Partial<Seat> = {}): Seat {
  return {
    id,
    floor_id: 'f1',
    code: `B211${id.slice(1).padStart(2, '0')}`,
    zone: null,
    owner_id: null,
    owner_emails: [],
    owner_name: null,
    active: true,
    sort_order: Number(id.slice(1)),
    created_at: '',
    ...over,
  }
}

function booking(seatId: string, slot: 'AM' | 'PM', userId = 'colleague'): Booking {
  return {
    id: `b-${seatId}-${slot}`,
    seat_id: seatId,
    user_id: userId,
    date: DATE,
    slot,
    status: 'booked',
    checked_in_at: null,
    counted_at: null,
    created_at: '',
    updated_at: '',
  }
}

function release(seatId: string, slot: 'AM' | 'PM'): Release {
  return { id: `r-${seatId}-${slot}`, seat_id: seatId, date: DATE, slot, created_by: 'owner', created_at: '' }
}

// A tiny seeded generator (mulberry32) so shuffles are repeatable in tests.
function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seats = [
  seat('s1'), // free
  seat('s2'), // taken all day
  seat('s3'), // morning taken: not free for a whole day
  seat('s4', { owner_emails: ['owner@cetin.cz'], owner_name: 'Owner' }), // held
  seat('s5', { owner_id: 'owner2' }), // owner released the whole day
  seat('s6', { active: false }), // inactive
  seat('s7'), // free
]
const bookings = [booking('s2', 'AM'), booking('s2', 'PM'), booking('s3', 'AM')]
const releases = [release('s5', 'AM'), release('s5', 'PM')]
const viewsFor = (choice: 'FULL' | 'PM') =>
  seats.map((s) => seatView({ seat: s, date: DATE, bookings, releases, choice, userId: 'me' }))
const notBlocked = () => false

describe('surpriseCandidates', () => {
  it('offers only seats free for the whole day', () => {
    expect(surpriseCandidates(viewsFor('FULL'), notBlocked)).toEqual(['s1', 's5', 's7'])
  })

  it('offers a seat whose morning is gone once only the afternoon is wanted', () => {
    expect(surpriseCandidates(viewsFor('PM'), notBlocked)).toEqual(['s1', 's3', 's5', 's7'])
  })

  it('leaves out blocked and excluded seats', () => {
    const views = viewsFor('FULL')
    expect(surpriseCandidates(views, (v) => v.seat.id === 's1', new Set(['s7']))).toEqual(['s5'])
  })

  it('is empty when nothing is free', () => {
    expect(surpriseCandidates(viewsFor('FULL'), () => true)).toEqual([])
  })
})

describe('pickRandomSeat', () => {
  it('returns null with no candidates', () => {
    expect(pickRandomSeat([])).toBeNull()
  })

  it('always returns one of the candidates, even at the edges of the generator', () => {
    const candidates = ['s1', 's5', 's7']
    expect(pickRandomSeat(candidates, () => 0)).toBe('s1')
    expect(pickRandomSeat(candidates, () => 0.9999999)).toBe('s7')
    expect(pickRandomSeat(candidates, () => 1)).toBe('s7')
  })

  it('is repeatable with a seeded generator and reaches every seat', () => {
    const candidates = ['s1', 's5', 's7']
    const run = (seed: number) => Array.from({ length: 30 }, ((rng) => () => pickRandomSeat(candidates, rng))(seeded(seed)))
    expect(run(42)).toEqual(run(42))
    expect(new Set(run(42))).toEqual(new Set(candidates))
  })
})

describe('shuffleHops', () => {
  const candidates = ['s1', 's5', 's7', 's9']

  it('ends on the pick, never repeats a seat back to back, and lands with a real move', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const hops = shuffleHops(candidates, 's7', 12, seeded(seed))
      expect(hops).toHaveLength(12)
      expect(hops[hops.length - 1]).toBe('s7')
      expect(hops[hops.length - 2]).not.toBe('s7')
      for (let i = 1; i < hops.length; i++) expect(hops[i]).not.toBe(hops[i - 1])
      for (const id of hops) expect(candidates).toContain(id)
    }
  })

  it('works with two seats and still lands with a move', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const hops = shuffleHops(['s1', 's7'], 's7', 6, seeded(seed))
      expect(hops).toHaveLength(6)
      expect(hops[hops.length - 1]).toBe('s7')
      expect(hops[hops.length - 2]).toBe('s1')
    }
  })

  it('goes straight to the pick when there is nothing else to visit', () => {
    expect(shuffleHops(['s7'], 's7', 12)).toEqual(['s7'])
  })
})

describe('hopTimes', () => {
  it('starts at 0, ends at the total and slows down', () => {
    const times = hopTimes(12, 1200)
    expect(times).toHaveLength(12)
    expect(times[0]).toBe(0)
    expect(times[11]).toBe(1200)
    const gaps = times.slice(1).map((t, i) => t - times[i])
    expect(gaps[gaps.length - 1]).toBeGreaterThan(gaps[0] * 3)
  })

  it('is a single instant for one hop', () => {
    expect(hopTimes(1, 1200)).toEqual([0])
  })
})
