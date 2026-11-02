import { describe, expect, it } from 'vitest'
import { presenceByDay, teamDayNudge } from './progress'

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

describe('teamDayNudge', () => {
  const days = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']
  const presence = new Map([
    ['2026-11-03', { people: 2, others: 1 }],
    ['2026-11-05', { people: 8, others: 7 }],
    ['2026-11-06', { people: 9, others: 9 }],
  ])

  it('celebrates when the selected day is a team day', () => {
    expect(teamDayNudge({ days, selected: '2026-11-05', presence, threshold: 8 })).toEqual({
      kind: 'team_day',
      date: '2026-11-05',
      others: 7,
    })
  })

  it('points to the nearest team day otherwise', () => {
    expect(teamDayNudge({ days, selected: '2026-11-03', presence, threshold: 8 })).toEqual({
      kind: 'join',
      date: '2026-11-05',
      others: 7,
    })
  })

  it('mentions who is in when no day is a team day', () => {
    expect(teamDayNudge({ days, selected: '2026-11-03', presence, threshold: 20 })).toEqual({
      kind: 'some',
      date: '2026-11-03',
      others: 1,
    })
  })

  it('stays quiet when nobody else is in', () => {
    expect(teamDayNudge({ days, selected: '2026-11-04', presence, threshold: 20 })).toBeNull()
  })

  it('is a team day for me alone only if the threshold allows it', () => {
    const solo = new Map([['2026-11-04', { people: 1, others: 0 }]])
    expect(teamDayNudge({ days, selected: '2026-11-04', presence: solo, threshold: 1 })).toEqual({
      kind: 'team_day',
      date: '2026-11-04',
      others: 0,
    })
  })
})
