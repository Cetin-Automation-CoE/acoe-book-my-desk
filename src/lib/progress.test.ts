import { describe, expect, it } from 'vitest'
import { presenceByDay } from './progress'

describe('presenceByDay', () => {
  it('counts distinct people per day and the colleagues other than me', () => {
    const rows = [
      { date: '2026-11-05', user_id: 'me' },
      { date: '2026-11-05', user_id: 'me' }, // AM + PM
      { date: '2026-11-05', user_id: 'ann' },
      { date: '2026-11-06', user_id: 'ann' },
      { date: '2026-11-06', user_id: 'ben' },
    ]
    const presence = presenceByDay(rows, 'me')
    expect(presence.get('2026-11-05')).toEqual({ people: 2, others: 1 })
    expect(presence.get('2026-11-06')).toEqual({ people: 2, others: 2 })
    expect(presence.get('2026-11-09')).toBeUndefined()
  })
})
