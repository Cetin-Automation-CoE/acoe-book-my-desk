import { describe, expect, it } from 'vitest'
import { gapsBefore } from './dates'
import { alternativeSeat, ringProgress, usualSeat } from './smart'

const seats = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { id: `s${n}`, code: `B211${String(n).padStart(2, '0')}` }
})
// Room order: even seat left, odd right (B21102 | B21101, B21104 | B21103, …).
const inRoomOrder = [2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11].map((n) => seats[n - 1])

describe('usualSeat', () => {
  it('is the seat booked most often', () => {
    const recent = [
      { seat_id: 's5', date: '2026-10-20' },
      { seat_id: 's5', date: '2026-10-22' },
      { seat_id: 's7', date: '2026-10-28' },
    ]
    expect(usualSeat(recent, null)).toBe('s5')
  })

  it('breaks ties by the most recent booking', () => {
    const recent = [
      { seat_id: 's5', date: '2026-10-20' },
      { seat_id: 's7', date: '2026-10-28' },
    ]
    expect(usualSeat(recent, null)).toBe('s7')
  })

  it('is the owned seat for a seat owner', () => {
    expect(usualSeat([{ seat_id: 's5', date: '2026-10-20' }], 's1')).toBe('s1')
  })

  it('is null without history', () => {
    expect(usualSeat([], null)).toBeNull()
  })
})

describe('alternativeSeat', () => {
  it('prefers the pair partner', () => {
    expect(alternativeSeat('s5', ['s6', 's7', 's3'], inRoomOrder)).toEqual({ seatId: 's6', nearness: 'pair' })
  })

  it('then the same table', () => {
    expect(alternativeSeat('s5', ['s7', 's3', 's9'], inRoomOrder)).toEqual({ seatId: 's7', nearness: 'table' })
  })

  it('then the closest seat number', () => {
    expect(alternativeSeat('s5', ['s3', 's9', 's12'], inRoomOrder)).toEqual({ seatId: 's3', nearness: 'closest' })
  })

  it('is null when nothing is free', () => {
    expect(alternativeSeat('s5', [], inRoomOrder)).toBeNull()
  })
})

describe('ringProgress', () => {
  it('is the share of the check-in window still left', () => {
    // AM: starts 06:00, deadline 10:00 → 240 min window; 08:40 leaves 80 min = 33%
    expect(ringProgress(8 * 60 + 40, 6 * 60, 10 * 60)).toBe(33)
  })

  it('never drops below 4% while open', () => {
    expect(ringProgress(9 * 60 + 59, 6 * 60, 10 * 60)).toBe(4)
  })

  it('is 100 before the window starts', () => {
    expect(ringProgress(5 * 60, 6 * 60, 10 * 60)).toBe(100)
  })
})

describe('gapsBefore', () => {
  it('marks the Monday after a weekend gap', () => {
    expect(gapsBefore(['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'])).toEqual(new Set(['2026-11-09']))
  })

  it('has no gaps in a plain run of days', () => {
    expect(gapsBefore(['2026-11-03', '2026-11-04'])).toEqual(new Set())
  })
})
