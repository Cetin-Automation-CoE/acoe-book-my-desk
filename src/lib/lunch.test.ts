import { describe, expect, it } from 'vitest'
import { lunchCounts, lunchOf } from './lunch'

const plans = [
  { user_id: 'ann', date: '2026-11-05', lunch: 'box' as const },
  { user_id: 'bob', date: '2026-11-05', lunch: 'out' as const },
  { user_id: 'cy', date: '2026-11-05', lunch: 'out' as const },
  { user_id: 'ann', date: '2026-11-06', lunch: 'out' as const },
]

describe('lunchOf', () => {
  it('is what the person recorded for the day', () => {
    expect(lunchOf(plans, 'ann', '2026-11-05')).toBe('box')
    expect(lunchOf(plans, 'ann', '2026-11-06')).toBe('out')
  })

  it('is null when nothing was recorded', () => {
    expect(lunchOf(plans, 'dee', '2026-11-05')).toBeNull()
    expect(lunchOf(plans, 'bob', '2026-11-06')).toBeNull()
  })
})

describe('lunchCounts', () => {
  it('counts the plans of the people who are in that day', () => {
    expect(lunchCounts(plans, '2026-11-05', ['ann', 'bob', 'cy'])).toEqual({ box: 1, out: 2 })
  })

  it('ignores a plan of someone who is not in', () => {
    expect(lunchCounts(plans, '2026-11-05', ['ann', 'dee'])).toEqual({ box: 1, out: 0 })
  })
})
