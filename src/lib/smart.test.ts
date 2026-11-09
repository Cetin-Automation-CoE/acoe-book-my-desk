import { describe, expect, it } from 'vitest'
import { gapsBefore } from './dates'
import type { SeatView } from './seatState'
import { alternativeSeat, cardVariant, usualSeat } from './smart'
import type { Seat } from './types'

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

  it('is the favourite when one is picked, whatever the history', () => {
    const recent = [
      { seat_id: 's5', date: '2026-10-20' },
      { seat_id: 's5', date: '2026-10-22' },
    ]
    expect(usualSeat(recent, null, 's9')).toBe('s9')
    expect(usualSeat([], null, 's9')).toBe('s9')
  })

  it('is the owned seat for a seat owner, even with a favourite', () => {
    expect(usualSeat([], 's1', 's9')).toBe('s1')
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

describe('gapsBefore', () => {
  it('marks the Monday after a weekend gap', () => {
    expect(gapsBefore(['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'])).toEqual(new Set(['2026-11-09']))
  })

  it('has no gaps in a plain run of days', () => {
    expect(gapsBefore(['2026-11-03', '2026-11-04'])).toEqual(new Set())
  })
})

// A seat view with only what cardVariant looks at.
const view = (n: number, kind: SeatView['kind']): SeatView =>
  ({ seat: { ...seats[n - 1] } as Seat, kind }) as SeatView

describe('cardVariant', () => {
  const roomViews = (taken: number[]) => [2, 1, 4, 3].map((n) => view(n, taken.includes(n) ? 'taken' : 'free'))

  it('offers the usual seat while it is free', () => {
    expect(cardVariant({ mine: [], usualId: 's1', views: roomViews([]), choice: 'FULL' })).toEqual({
      kind: 'usual',
      seatId: 's1',
      slot: 'FULL',
    })
  })

  it('offers the nearest free seat when the usual one is taken', () => {
    expect(cardVariant({ mine: [], usualId: 's1', views: roomViews([1]), choice: 'FULL' })).toMatchObject({
      kind: 'alternative',
      seatId: 's2',
      nearness: 'pair',
    })
  })

  it('offers nothing else to a seat owner whose own seat is taken', () => {
    expect(cardVariant({ mine: [], usualId: 's1', views: roomViews([1]), choice: 'FULL', lockedToUsual: true })).toBeNull()
  })
})
